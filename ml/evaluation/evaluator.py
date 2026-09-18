"""
TOUCHLINE — PHASE 6: HELD-OUT TEST EVALUATOR & DIAGNOSTIC REPORT GENERATOR
Evaluates final models strictly ONCE on the held-out test set (2024/25) and generates reports.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from ml.features.feature_builder import FEATURE_COLUMNS
from ml.models.target_builder import ATTRIBUTE_DOMAINS
from ml.training.trainer import POSITION_GROUPS

def evaluate_held_out_test(
    best_models: Dict[str, Dict[str, Any]], test_df: pd.DataFrame
) -> Dict[str, Any]:
    """
    Evaluates final models ONCE on held-out test set (seasonYearEnd == 2025).
    """
    test_results = {}

    for pg in POSITION_GROUPS:
        test_results[pg] = {}
        sub_test = test_df[test_df["positionGroup"] == pg]
        if len(sub_test) == 0:
            continue

        X_test = sub_test[FEATURE_COLUMNS].values

        for domain in ATTRIBUTE_DOMAINS:
            if pg in best_models and domain in best_models[pg]:
                model = best_models[pg][domain]["model"]
                model_name = best_models[pg][domain]["model_name"]
                y_test = sub_test[domain].values

                preds_test = model.predict(X_test)

                mae = float(mean_absolute_error(y_test, preds_test))
                rmse = float(np.sqrt(mean_squared_error(y_test, preds_test)))
                r2 = float(r2_score(y_test, preds_test))

                # Feature importances if available
                feature_importances = {}
                if hasattr(model, "feature_importances_"):
                    importances = model.feature_importances_
                    feature_importances = dict(zip(FEATURE_COLUMNS, [float(x) for x in importances]))
                elif hasattr(model, "coef_"):
                    importances = np.abs(model.coef_)
                    feature_importances = dict(zip(FEATURE_COLUMNS, [float(x) for x in importances]))

                test_results[pg][domain] = {
                    "model_name": model_name,
                    "test_mae": mae,
                    "test_rmse": rmse,
                    "test_r2": r2,
                    "sample_count": len(sub_test),
                    "feature_importances": feature_importances,
                }

    return test_results

def compute_ratings_distribution(predictions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes statistical distribution metrics across rated players.
    """
    rated = [p for p in predictions if p["status"] == "RATED"]
    unrated = [p for p in predictions if p["status"] == "UNRATED"]

    if not rated:
        return {"error": "No rated players found"}

    ovrs = [p["ovr"] for p in rated]
    confs = [p["confidence"] for p in rated]

    bands = {
        "1-49": len([o for o in ovrs if o < 50]),
        "50-59": len([o for o in ovrs if 50 <= o <= 59]),
        "60-69": len([o for o in ovrs if 60 <= o <= 69]),
        "70-79": len([o for o in ovrs if 70 <= o <= 79]),
        "80-84": len([o for o in ovrs if 80 <= o <= 84]),
        "85-89": len([o for o in ovrs if 85 <= o <= 89]),
        "90-91": len([o for o in ovrs if 90 <= o <= 91]),
    }

    pos_ovr = {}
    for p in rated:
        pos = p["positionGroup"]
        pos_ovr.setdefault(pos, []).append(p["ovr"])

    pos_stats = {pos: {"count": len(vals), "mean_ovr": float(np.mean(vals)), "max_ovr": int(np.max(vals)), "min_ovr": int(np.min(vals))} for pos, vals in pos_ovr.items()}

    comp_ovr = {}
    for p in rated:
        c = p["competitionCode"]
        comp_ovr.setdefault(c, []).append(p["ovr"])

    comp_stats = {c: {"count": len(vals), "mean_ovr": float(np.mean(vals))} for c, vals in comp_ovr.items()}

    return {
        "total_players": len(predictions),
        "total_rated": len(rated),
        "total_unrated": len(unrated),
        "ovr_min": int(np.min(ovrs)),
        "ovr_max": int(np.max(ovrs)),
        "ovr_mean": float(np.mean(ovrs)),
        "ovr_median": float(np.median(ovrs)),
        "ovr_std": float(np.std(ovrs)),
        "conf_mean": float(np.mean(confs)),
        "conf_min": float(np.min(confs)),
        "conf_max": float(np.max(confs)),
        "ovr_bands": bands,
        "position_distribution": pos_stats,
        "competition_distribution": comp_stats,
    }
