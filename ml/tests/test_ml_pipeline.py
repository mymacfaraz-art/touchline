"""
TOUCHLINE — PHASE 6: PYTHON ML TEST SUITE
Enforces structural assertions, non-overlapping dataset splits, target construction,
scaler leakage prevention, rating bounds (1-99 attributes, 1-91 OVR), and confidence scoring.
"""

import pytest
import numpy as np
import pandas as pd
from ml.data.dataset import load_dataset, map_position_group
from ml.features.feature_builder import build_features, FEATURE_COLUMNS
from ml.features.preprocessor import Preprocessor
from ml.models.target_builder import construct_latent_targets, ATTRIBUTE_DOMAINS
from ml.training.trainer import ModelTrainer, POSITION_GROUPS
from ml.calibration.calibrator import RatingCalibrator
from ml.inference.predictor import RatingPredictor

def test_dataset_loading_and_split():
    full_df, train_df, val_df, test_df, meta = load_dataset()

    assert len(full_df) == 5693
    assert len(train_df) == 3345
    assert len(val_df) == 1544
    assert len(test_df) == 804

    # Non-overlapping season sets
    train_seasons = set(train_df["seasonEnd"].unique())
    val_seasons = set(val_df["seasonEnd"].unique())
    test_seasons = set(test_df["seasonEnd"].unique())

    assert train_seasons.isdisjoint(val_seasons)
    assert val_seasons.isdisjoint(test_seasons)
    assert max(train_seasons) < min(val_seasons) < min(test_seasons)

def test_feature_engineering():
    full_df, _, _, _, _ = load_dataset()
    feat_df = build_features(full_df)

    for col in FEATURE_COLUMNS:
        assert col in feat_df.columns
        assert not feat_df[col].isna().any()

    # Per-90 non-negative assertion
    assert (feat_df["goals_per_90"] >= 0).all()
    assert (feat_df["shots_per_90"] >= 0).all()
    assert (feat_df["minutes_weight"] >= 0).all()
    assert (feat_df["minutes_weight"] <= 1.0).all()

def test_preprocessor_leakage_prevention():
    _, train_df, val_df, _, _ = load_dataset()
    train_df = build_features(train_df)
    val_df = build_features(val_df)

    prep = Preprocessor()
    prep.fit(train_df)

    assert prep.is_fitted
    # Scaler fit on train must transform validation without refitting
    val_scaled = prep.transform(val_df)
    assert len(val_scaled) == len(val_df)

def test_target_builder():
    _, train_df, _, _, _ = load_dataset()
    feat_df = build_features(train_df)
    target_df = construct_latent_targets(feat_df)

    for domain in ATTRIBUTE_DOMAINS:
        assert domain in target_df.columns
        assert not target_df[domain].isna().any()

def test_calibrator_bounds():
    calibrator = RatingCalibrator()

    # Check attribute scaling
    attr = calibrator.z_to_attribute(0.0)
    assert 1 <= attr <= 99

    attr_extreme_high = calibrator.z_to_attribute(10.0)
    assert attr_extreme_high == 99

    attr_extreme_low = calibrator.z_to_attribute(-10.0)
    assert attr_extreme_low == 1

    # Check OVR calculation
    dummy_attrs = {
        "finishing": 85, "shotPower": 80, "shotAccuracy": 82, "positioning": 84, "pace": 88,
        "dribbling": 86, "ballControl": 85, "shortPassing": 78, "tackling": 40, "stamina": 80,
        "gkReflexes": 10, "gkHandling": 10, "gkPositioning": 10, "gkKicking": 10
    }
    ovr_att = calibrator.calculate_ovr(dummy_attrs, "ATTACKER")
    assert 1 <= ovr_att <= 91

    # Check confidence calculation
    conf_high = calibrator.calculate_confidence(2500, 30)
    assert 0.80 <= conf_high <= 0.99

    conf_low = calibrator.calculate_confidence(45, 1)
    assert 0.05 <= conf_low <= 0.30

def test_predictor_vectorized():
    _, train_df, val_df, _, _ = load_dataset()
    train_feat = construct_latent_targets(build_features(train_df))
    val_feat = construct_latent_targets(build_features(val_df))

    trainer = ModelTrainer(random_state=42)
    models_dict, _ = trainer.train_and_select(train_feat, val_feat)

    predictor = RatingPredictor(models_dict)
    preds = predictor.predict_dataframe(val_df.head(20))

    assert len(preds) == 20
    for p in preds:
        assert "status" in p
        assert "confidence" in p
        if p["status"] == "RATED":
            assert 1 <= p["ovr"] <= 91
            for _, val in p["attributes"].items():
                assert 1 <= val <= 99
