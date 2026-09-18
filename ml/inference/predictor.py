"""
TOUCHLINE — PHASE 6: VECTORIZED INFERENCE ENGINE & RATING GENERATOR
Runs fast, vectorized batch prediction across player-seasons using trained ML models and calibrator.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List

from ml.features.feature_builder import build_features, FEATURE_COLUMNS
from ml.models.target_builder import ATTRIBUTE_DOMAINS
from ml.calibration.calibrator import RatingCalibrator
from ml.training.trainer import POSITION_GROUPS

MODEL_VERSION = "touchline-ml-v1"
FEATURE_VERSION = "features-v1"
DATASET_VERSION = "phase5-verified"
CALIBRATION_VERSION = "calibration-v1"

class RatingPredictor:
    def __init__(self, best_models: Dict[str, Dict[str, Any]]):
        self.best_models = best_models
        self.calibrator = RatingCalibrator()

    def predict_dataframe(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Predicts player attributes, Touchline OVR, and confidence scores for a DataFrame of player-seasons.
        Uses vectorized matrix operations per position group.
        """
        feat_df = build_features(df).copy()
        n_rows = len(feat_df)

        # Pre-allocate predictions dictionary per position group & domain
        preds_map = {domain: np.zeros(n_rows) for domain in ATTRIBUTE_DOMAINS}

        for pg in POSITION_GROUPS:
            mask = (feat_df["positionGroup"] == pg).values
            if not mask.any() or pg not in self.best_models:
                continue

            X_group = feat_df.loc[mask, FEATURE_COLUMNS].values
            for domain in ATTRIBUTE_DOMAINS:
                if domain in self.best_models[pg]:
                    model = self.best_models[pg][domain]["model"]
                    preds_group = model.predict(X_group)
                    preds_map[domain][mask] = preds_group

        results = []
        for idx, row in feat_df.reset_index(drop=True).iterrows():
            pg = row["positionGroup"]
            minutes = int(row["minutesPlayed"])
            apps = int(row["appearances"])
            is_gk = (pg == "GOALKEEPER")

            if minutes < 90:
                results.append({
                    "statId": row["statId"],
                    "playerId": row["playerId"],
                    "playerName": row["playerName"],
                    "shortName": row["shortName"],
                    "nationality": row["nationality"],
                    "primaryPosition": row["primaryPosition"],
                    "positionGroup": pg,
                    "clubName": row["clubName"],
                    "clubCode": row["clubCode"],
                    "seasonKey": row["seasonKey"],
                    "seasonEnd": row["seasonEnd"],
                    "competitionCode": row["competitionCode"],
                    "minutesPlayed": minutes,
                    "appearances": apps,
                    "status": "UNRATED",
                    "unratedReason": f"Insufficient playing time ({minutes} mins < 90 mins threshold)",
                    "ovr": None,
                    "confidence": 0.05,
                    "attributes": {},
                    "modelVersion": MODEL_VERSION,
                    "featureVersion": FEATURE_VERSION,
                    "datasetVersion": DATASET_VERSION,
                    "calibrationVersion": CALIBRATION_VERSION,
                })
                continue

            domain_preds = {domain: float(preds_map[domain][idx]) for domain in ATTRIBUTE_DOMAINS}

            attrs, ovr, conf = self.calibrator.calibrate_predictions(
                domain_preds, pg, minutes, apps, is_gk
            )

            results.append({
                "statId": row["statId"],
                "playerId": row["playerId"],
                "playerName": row["playerName"],
                "shortName": row["shortName"],
                "nationality": row["nationality"],
                "primaryPosition": row["primaryPosition"],
                "positionGroup": pg,
                "clubName": row["clubName"],
                "clubCode": row["clubCode"],
                "seasonKey": row["seasonKey"],
                "seasonEnd": row["seasonEnd"],
                "competitionCode": row["competitionCode"],
                "minutesPlayed": minutes,
                "appearances": apps,
                "status": "RATED",
                "unratedReason": None,
                "ovr": ovr,
                "confidence": conf,
                "attributes": attrs,
                "modelVersion": MODEL_VERSION,
                "featureVersion": FEATURE_VERSION,
                "datasetVersion": DATASET_VERSION,
                "calibrationVersion": CALIBRATION_VERSION,
            })

        return results
