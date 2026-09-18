"""
TOUCHLINE — PHASE 6: FEATURE BUILDER
Transforms raw seasonal player records into normalized ML feature vectors.
Enforces season-locality (no future information leakage).
"""

import pandas as pd
import numpy as np
from typing import List

FEATURE_COLUMNS = [
    "goals_per_90",
    "shots_per_90",
    "shots_on_target_per_90",
    "shot_accuracy",
    "conversion_rate",
    "assists_per_90",
    "key_passes_per_90",
    "passes_completed_per_90",
    "tackles_per_90",
    "interceptions_per_90",
    "clearances_per_90",
    "aerial_duels_per_90",
    "saves_per_90",
    "goals_conceded_per_90",
    "clean_sheet_rate",
    "save_pct",
    "starts_ratio",
    "yellow_cards_per_90",
    "red_cards_per_90",
    "age",
    "height",
    "weight",
    "minutes_weight"
]

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes season-local per-90 rates and ratio metrics.
    Does NOT use multi-season or future aggregates.
    """
    feat = df.copy()

    minutes = feat["minutesPlayed"].replace(0, np.nan)
    p90 = 90.0 / minutes.fillna(1.0)

    # Low minutes filter mask
    has_mins = feat["minutesPlayed"] > 0
    p90_factor = np.where(has_mins, 90.0 / feat["minutesPlayed"].clip(lower=1), 0.0)

    feat["goals_per_90"] = np.where(has_mins, feat["goals"] * p90_factor, 0.0)
    feat["shots_per_90"] = np.where(has_mins, feat["shots"] * p90_factor, 0.0)
    feat["shots_on_target_per_90"] = np.where(has_mins, feat["shotsOnTarget"] * p90_factor, 0.0)

    shots = feat["shots"]
    feat["shot_accuracy"] = np.where(shots > 0, feat["shotsOnTarget"] / shots, 0.0)
    feat["conversion_rate"] = np.where(shots > 0, feat["goals"] / shots, 0.0)

    feat["assists_per_90"] = np.where(has_mins, feat["assists"] * p90_factor, 0.0)
    feat["key_passes_per_90"] = np.where(has_mins, feat["keyPasses"] * p90_factor, 0.0)
    feat["passes_completed_per_90"] = np.where(has_mins, feat["passesCompleted"] * p90_factor, 0.0)

    feat["tackles_per_90"] = np.where(has_mins, feat["tackles"] * p90_factor, 0.0)
    feat["interceptions_per_90"] = np.where(has_mins, feat["interceptions"] * p90_factor, 0.0)
    feat["clearances_per_90"] = np.where(has_mins, feat["clearances"] * p90_factor, 0.0)
    feat["aerial_duels_per_90"] = np.where(has_mins, feat["aerialDuelsWon"] * p90_factor, 0.0)

    feat["saves_per_90"] = np.where(has_mins, feat["saves"] * p90_factor, 0.0)
    feat["goals_conceded_per_90"] = np.where(has_mins, feat["goalsConceded"] * p90_factor, 0.0)

    apps = feat["appearances"].clip(lower=1)
    has_apps = feat["appearances"] > 0
    feat["clean_sheet_rate"] = np.where(has_apps, feat["cleanSheets"] / apps, 0.0)
    feat["starts_ratio"] = np.where(has_apps, feat["starts"] / apps, 0.0)

    shots_faced = feat["saves"] + feat["goalsConceded"]
    feat["save_pct"] = np.where(shots_faced > 0, feat["saves"] / shots_faced, 0.0)

    feat["yellow_cards_per_90"] = np.where(has_mins, feat["yellowCards"] * p90_factor, 0.0)
    feat["red_cards_per_90"] = np.where(has_mins, feat["redCards"] * p90_factor, 0.0)

    # Empirical Bayes minutes shrinkage weight
    feat["minutes_weight"] = feat["minutesPlayed"] / (feat["minutesPlayed"] + 450.0)

    # Fill NaNs
    for col in FEATURE_COLUMNS:
        if col in feat.columns:
            feat[col] = feat[col].fillna(0.0)

    return feat
