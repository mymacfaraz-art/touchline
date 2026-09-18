"""
TOUCHLINE — PHASE 6: MODEL TRAINER & HYPERPARAMETER TUNER
Trains, tunes, and evaluates candidate ML models per position group and attribute domain.
Follows strict time-aware validation and saves trained artifacts to ml/artifacts/.
"""

import pandas as pd
import numpy as np
import os
import joblib
from typing import Dict, Any, Tuple, List

from sklearn.linear_model import ElasticNet
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from ml.features.feature_builder import FEATURE_COLUMNS
from ml.models.target_builder import ATTRIBUTE_DOMAINS

POSITION_GROUPS = ["GOALKEEPER", "DEFENDER", "MIDFIELDER", "ATTACKER"]

class ModelTrainer:
    def __init__(self, random_state: int = 42):
        self.random_state = random_state
        self.best_models: Dict[str, Dict[str, Any]] = {}
        self.eval_results: Dict[str, Dict[str, Any]] = {}

    def get_candidate_models(self) -> Dict[str, Any]:
        """Returns baseline and non-linear regressor candidate models."""
        return {
            "ElasticNet": ElasticNet(alpha=0.1, l1_ratio=0.5, random_state=self.random_state, max_iter=2000),
            "RandomForest": RandomForestRegressor(n_estimators=100, max_depth=8, random_state=self.random_state, n_jobs=-1),
            "HistGradientBoosting": HistGradientBoostingRegressor(max_iter=100, max_depth=6, random_state=self.random_state),
        }

    def train_and_select(
        self, train_df: pd.DataFrame, val_df: pd.DataFrame
    ) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, Any]]:
        """
        Trains model candidates per (position_group, domain) pair on train_df,
        evaluates on val_df, and selects the model with the lowest validation MAE.
        """
        results = {}
        models_dict = {}

        for pg in POSITION_GROUPS:
            results[pg] = {}
            models_dict[pg] = {}

            train_pg = train_df[train_df["positionGroup"] == pg]
            val_pg = val_df[val_df["positionGroup"] == pg]

            if len(train_pg) == 0 or len(val_pg) == 0:
                print(f"Warning: Insufficient samples for position group {pg}")
                continue

            X_train = train_pg[FEATURE_COLUMNS].values
            X_val = val_pg[FEATURE_COLUMNS].values

            for domain in ATTRIBUTE_DOMAINS:
                y_train = train_pg[domain].values
                y_val = val_pg[domain].values

                candidates = self.get_candidate_models()
                domain_results = {}
                best_model_name = None
                best_mae = float("inf")
                best_fitted_model = None

                for name, model in candidates.items():
                    model.fit(X_train, y_train)
                    preds_val = model.predict(X_val)

                    mae = float(mean_absolute_error(y_val, preds_val))
                    rmse = float(np.sqrt(mean_squared_error(y_val, preds_val)))
                    r2 = float(r2_score(y_val, preds_val))

                    domain_results[name] = {"val_mae": mae, "val_rmse": rmse, "val_r2": r2}

                    if mae < best_mae:
                        best_mae = mae
                        best_model_name = name
                        best_fitted_model = model

                preds_train = best_fitted_model.predict(X_train)
                train_mae = float(mean_absolute_error(y_train, preds_train))
                train_rmse = float(np.sqrt(mean_squared_error(y_train, preds_train)))

                models_dict[pg][domain] = {
                    "model": best_fitted_model,
                    "model_name": best_model_name,
                    "val_mae": best_mae,
                    "val_rmse": domain_results[best_model_name]["val_rmse"],
                    "val_r2": domain_results[best_model_name]["val_r2"],
                    "train_mae": train_mae,
                    "train_rmse": train_rmse,
                }

                results[pg][domain] = {
                    "candidates": domain_results,
                    "selected_model": best_model_name,
                    "best_val_mae": best_mae,
                }

        self.best_models = models_dict
        self.eval_results = results
        return models_dict, results

    def save_artifacts(self, artifact_dir: str = "ml/artifacts"):
        """Saves trained models to artifact directory."""
        os.makedirs(artifact_dir, exist_ok=True)
        joblib.dump(self.best_models, os.path.join(artifact_dir, "best_models.joblib"))
        joblib.dump(self.eval_results, os.path.join(artifact_dir, "training_eval_results.joblib"))
        print(f"Saved trained models to {artifact_dir}")
