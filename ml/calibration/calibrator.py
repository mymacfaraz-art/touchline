"""
TOUCHLINE — PHASE 6: CALIBRATION & CONFIDENCE ENGINE
Calibrates raw ML domain predictions into 1-99 Attributes, 1-91 Touchline OVR,
and calculates confidence scores based on sample size and data completeness.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from scipy.stats import norm

class RatingCalibrator:
    def __init__(self):
        pass

    @staticmethod
    def z_to_attribute(z: float, min_val: int = 40, max_val: int = 99, mean_target: float = 68.0, std_target: float = 11.0) -> int:
        """
        Maps standard normal z-score to integer attribute scale [1, 99].
        Uses realistic mean (~68) and standard deviation (~11).
        """
        if np.isnan(z) or np.isinf(z):
            z = 0.0
        val = mean_target + z * std_target
        return int(np.clip(np.round(val), 1, 99))

    @staticmethod
    def calculate_ovr(attributes: Dict[str, int], position_group: str) -> int:
        """
        Computes calibrated Touchline OVR (1–91 scale) using position-weighted domain combinations.
        """
        if position_group == "GOALKEEPER":
            raw_ovr = (
                0.40 * attributes.get("gkReflexes", 50) +
                0.25 * attributes.get("gkHandling", 50) +
                0.20 * attributes.get("gkPositioning", 50) +
                0.15 * attributes.get("gkKicking", 50)
            )
        elif position_group == "DEFENDER":
            raw_ovr = (
                0.35 * attributes.get("tackling", 50) +
                0.25 * attributes.get("interceptions", 50) +
                0.20 * attributes.get("marking", 50) +
                0.10 * attributes.get("stamina", 50) +
                0.10 * attributes.get("shortPassing", 50)
            )
        elif position_group == "MIDFIELDER":
            raw_ovr = (
                0.30 * attributes.get("shortPassing", 50) +
                0.20 * attributes.get("vision", 50) +
                0.20 * attributes.get("dribbling", 50) +
                0.15 * attributes.get("tackling", 50) +
                0.15 * attributes.get("stamina", 50)
            )
        else:  # ATTACKER
            raw_ovr = (
                0.40 * attributes.get("finishing", 50) +
                0.20 * attributes.get("dribbling", 50) +
                0.15 * attributes.get("shotPower", 50) +
                0.15 * attributes.get("positioning", 50) +
                0.10 * attributes.get("pace", 50)
            )

        # Scale raw composite to 1–91 Touchline ceiling
        # Target mean ~ 68, max capped at 91
        ovr = int(np.clip(np.round(raw_ovr), 1, 91))
        return ovr

    @staticmethod
    def calculate_confidence(minutes_played: int, appearances: int, is_gk: bool = False) -> float:
        """
        Calculates confidence score [0.00, 1.00] based on sample size reliability.
        """
        if minutes_played <= 0:
            return 0.10
        
        # Minutes factor: full sample size around 1800 minutes (20 matches)
        mins_factor = min(1.0, minutes_played / 1800.0)
        
        # Appearances factor
        apps_factor = min(1.0, appearances / 20.0)
        
        base_confidence = 0.40 + 0.40 * mins_factor + 0.20 * apps_factor
        
        # Low minutes penalty (< 300 mins)
        if minutes_played < 300:
            base_confidence *= 0.50

        return float(np.clip(round(base_confidence, 2), 0.05, 0.99))

    def calibrate_predictions(
        self, domain_preds: Dict[str, float], position_group: str, minutes_played: int, appearances: int, is_gk: bool = False
    ) -> Tuple[Dict[str, int], int, float]:
        """
        Transforms raw domain z-scores into complete attribute vector, OVR, and confidence score.
        """
        z_shoot = domain_preds.get("target_shooting", 0.0)
        z_pass = domain_preds.get("target_passing", 0.0)
        z_def = domain_preds.get("target_defending", 0.0)
        z_drib = domain_preds.get("target_dribbling", 0.0)
        z_phys = domain_preds.get("target_physical", 0.0)
        z_gk = domain_preds.get("target_goalkeeping", 0.0)

        # Map to specific 1–99 Touchline attributes
        attrs = {
            # Shooting
            "finishing": self.z_to_attribute(z_shoot),
            "shotPower": self.z_to_attribute(z_shoot * 0.9 + z_phys * 0.1),
            "shotAccuracy": self.z_to_attribute(z_shoot * 0.95),
            "positioning": self.z_to_attribute(z_shoot * 0.7 + z_drib * 0.3),
            "attackingMovement": self.z_to_attribute(z_shoot * 0.6 + z_phys * 0.4),

            # Passing & Creation
            "shortPassing": self.z_to_attribute(z_pass),
            "longPassing": self.z_to_attribute(z_pass * 0.9),
            "vision": self.z_to_attribute(z_pass * 0.95),
            "crossing": self.z_to_attribute(z_pass * 0.85),
            "throughBalls": self.z_to_attribute(z_pass * 0.9),
            "chanceCreation": self.z_to_attribute(z_pass * 0.95),

            # Defending
            "tackling": self.z_to_attribute(z_def),
            "interceptions": self.z_to_attribute(z_def * 0.95),
            "marking": self.z_to_attribute(z_def * 0.9),
            "defensiveAwareness": self.z_to_attribute(z_def * 0.95),
            "positioningDef": self.z_to_attribute(z_def * 0.9),
            "blocks": self.z_to_attribute(z_def * 0.85),
            "aerialAbility": self.z_to_attribute(z_def * 0.7 + z_phys * 0.3),

            # Dribbling & Control
            "dribbling": self.z_to_attribute(z_drib),
            "ballControl": self.z_to_attribute(z_drib * 0.95 + z_pass * 0.05),
            "composure": self.z_to_attribute(z_drib * 0.8 + z_phys * 0.2),

            # Physical
            "stamina": self.z_to_attribute(z_phys),
            "strength": self.z_to_attribute(z_phys * 0.9),
            "pace": self.z_to_attribute(z_phys * 0.85 + z_drib * 0.15),
            "acceleration": self.z_to_attribute(z_phys * 0.85 + z_drib * 0.15),
            "workRate": self.z_to_attribute(z_phys * 0.8 + z_def * 0.2),

            # Goalkeeping (null for outfield, populated for GK)
            "gkReflexes": self.z_to_attribute(z_gk) if is_gk else 10,
            "gkHandling": self.z_to_attribute(z_gk * 0.95) if is_gk else 10,
            "gkPositioning": self.z_to_attribute(z_gk * 0.9) if is_gk else 10,
            "gkKicking": self.z_to_attribute(z_pass * 0.8 + z_gk * 0.2) if is_gk else 10,
            "gkClaims": self.z_to_attribute(z_gk * 0.85) if is_gk else 10,
        }

        ovr = self.calculate_ovr(attrs, position_group)
        confidence = self.calculate_confidence(minutes_played, appearances, is_gk)

        return attrs, ovr, confidence
