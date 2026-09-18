"""
TOUCHLINE — PHASE 6: PREPROCESSOR & SCALER LEAKAGE GUARD
Handles feature scaling (StandardScaler/RobustScaler) ensuring scalers are fit ONLY on train.
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from typing import Dict, Tuple, List
import joblib
import os
from .feature_builder import FEATURE_COLUMNS

class Preprocessor:
    def __init__(self, position_groups: List[str] = None):
        if position_groups is None:
            position_groups = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'ATTACKER']
        self.position_groups = position_groups
        self.scalers: Dict[str, StandardScaler] = {}
        self.is_fitted = False

    def fit(self, train_df: pd.DataFrame) -> 'Preprocessor':
        """
        Fits StandardScaler ONLY on training data per position group.
        """
        for pg in self.position_groups:
            group_data = train_df[train_df['positionGroup'] == pg]
            scaler = StandardScaler()
            if len(group_data) > 0:
                X = group_data[FEATURE_COLUMNS].values
                scaler.fit(X)
            self.scalers[pg] = scaler
        self.is_fitted = True
        return self

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Applies fitted scalers to data without refitting.
        """
        if not self.is_fitted:
            raise RuntimeError("Preprocessor must be fit on training data before calling transform.")

        df_scaled = df.copy()
        for pg in self.position_groups:
            mask = df_scaled['positionGroup'] == pg
            if mask.sum() > 0 and pg in self.scalers:
                scaler = self.scalers[pg]
                X = df_scaled.loc[mask, FEATURE_COLUMNS].values
                X_scaled = scaler.transform(X)
                # Store scaled columns as scaled_colname
                scaled_df = pd.DataFrame(X_scaled, columns=[f"scaled_{c}" for c in FEATURE_COLUMNS], index=df_scaled.loc[mask].index)
                for sc in scaled_df.columns:
                    df_scaled.loc[mask, sc] = scaled_df[sc]

        return df_scaled

    def fit_transform(self, train_df: pd.DataFrame) -> pd.DataFrame:
        self.fit(train_df)
        return self.transform(train_df)

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(self, filepath)

    @classmethod
    def load(cls, filepath: str) -> 'Preprocessor':
        return joblib.load(filepath)
