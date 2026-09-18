"""
TOUCHLINE — PHASE 6: LATENT TARGET BUILDER
Constructs statistically grounded latent performance target labels for attribute domains
using position-adjusted empirical distributions and Empirical-Bayes shrinkage.
"""

import pandas as pd
import numpy as np
from typing import Dict, List

ATTRIBUTE_DOMAINS = [
    "target_shooting",
    "target_passing",
    "target_defending",
    "target_dribbling",
    "target_physical",
    "target_goalkeeping"
]

def construct_latent_targets(df: pd.DataFrame) -> pd.DataFrame:
    """
    Constructs latent attribute domain target labels with Empirical-Bayes shrinkage.
    
    Shrinkage formula:
        T_shrunk = w * T_raw + (1 - w) * T_population_mean
    where w = minutes / (minutes + 450.0).
    """
    data = df.copy()

    # Raw performance composite signals
    raw_shooting = (
        0.45 * data["goals_per_90"] +
        0.25 * data["conversion_rate"] +
        0.15 * data["shot_accuracy"] +
        0.15 * data["shots_on_target_per_90"]
    )

    raw_passing = (
        0.40 * data["assists_per_90"] +
        0.35 * data["key_passes_per_90"] +
        0.25 * data["passes_completed_per_90"]
    )

    raw_defending = (
        0.35 * data["tackles_per_90"] +
        0.35 * data["interceptions_per_90"] +
        0.15 * data["clearances_per_90"] +
        0.15 * data["aerial_duels_per_90"]
    )

    raw_dribbling = (
        0.40 * data["starts_ratio"] +
        0.30 * data["shot_accuracy"] +
        0.30 * data["key_passes_per_90"]
    )

    raw_physical = (
        0.50 * (data["minutesPlayed"] / 2700.0).clip(upper=1.0) +
        0.30 * (data["height"] / 200.0) +
        0.20 * data["starts_ratio"]
    )

    raw_gk = (
        0.45 * data["save_pct"] +
        0.35 * data["clean_sheet_rate"] +
        0.20 * (1.0 / (data["goals_conceded_per_90"] + 0.5))
    )

    raw_targets = {
        "target_shooting": raw_shooting,
        "target_passing": raw_passing,
        "target_defending": raw_defending,
        "target_dribbling": raw_dribbling,
        "target_physical": raw_physical,
        "target_goalkeeping": raw_gk,
    }

    w = data["minutes_weight"]

    for domain, raw_series in raw_targets.items():
        shrunk_series = pd.Series(index=data.index, dtype=float)
        for pg in data["positionGroup"].unique():
            mask = data["positionGroup"] == pg
            if mask.sum() > 0:
                pg_mean = raw_series[mask].mean()
                shrunk_series.loc[mask] = w.loc[mask] * raw_series.loc[mask] + (1.0 - w.loc[mask]) * pg_mean

        # Standardize shrunk targets per domain (z-score)
        std = shrunk_series.std()
        if std > 0:
            shrunk_series = (shrunk_series - shrunk_series.mean()) / std
        else:
            shrunk_series = shrunk_series - shrunk_series.mean()

        data[domain] = shrunk_series

    return data
