"""
TOUCHLINE — PHASE 6: ML DATASET LOADER & PARTITIONER
Loads real football dataset from Phase 5 JSON seed and performs time-aware splitting.
"""

import json
import os
from typing import Dict, Tuple, Any
import pandas as pd
import numpy as np

def map_position_group(pos: str) -> str:
    """Maps canonical player position to position model group."""
    pos = str(pos).upper().strip()
    if pos == 'GK':
        return 'GOALKEEPER'
    elif pos in ['CB', 'LB', 'RB', 'LWB', 'RWB']:
        return 'DEFENDER'
    elif pos in ['CDM', 'CM', 'CAM', 'LM', 'RM', 'DM', 'AM']:
        return 'MIDFIELDER'
    else:
        return 'ATTACKER'

def load_dataset(dataset_path: str = "src/data/seeds/real-football-dataset.json") -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """
    Loads Phase 5 verified dataset and partitions into Train, Validation, and Test.
    
    Returns:
        full_df: Complete DataFrame of all player-seasons
        train_df: Train partition (seasonYearEnd <= 2023)
        val_df: Validation partition (seasonYearEnd == 2024)
        test_df: Held-out Test partition (seasonYearEnd == 2025)
        metadata: Dataset dictionary metadata
    """
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset seed not found at {dataset_path}")

    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    players_dict = {p["sourceId"]: p for p in data.get("players", [])}
    clubs_dict = {c["sourceId"]: c for c in data.get("clubs", [])}

    rows = []
    for stat in data.get("playerStats", []):
        player_id = stat.get("playerSourceId")
        player = players_dict.get(player_id, {})

        birth_date = player.get("dateOfBirth", "1998-01-01T00:00:00.000Z")
        year_end = stat.get("seasonYearEnd", 2024)
        ref_year = year_end
        try:
            birth_year = int(str(birth_date)[:4])
            age = ref_year - birth_year
        except Exception:
            age = 25

        pos = player.get("primaryPosition", "CM")
        pos_group = map_position_group(pos)
        club_id = stat.get("clubSourceId", "")
        club = clubs_dict.get(club_id, {})

        row = {
            "statId": stat.get("sourceId"),
            "playerId": player_id,
            "playerName": f"{player.get('firstName', '')} {player.get('lastName', '')}".strip() or player.get("shortName", "Unknown Player"),
            "shortName": player.get("shortName", "Player"),
            "nationality": player.get("nationality", "ENG"),
            "primaryPosition": pos,
            "positionGroup": pos_group,
            "height": player.get("height", 180),
            "weight": player.get("weight", 75),
            "preferredFoot": player.get("preferredFoot", "RIGHT"),
            "clubId": club_id,
            "clubName": club.get("name", "Free Agent"),
            "clubCode": club.get("code", "FA"),
            "seasonStart": stat.get("seasonYearStart", year_end - 1),
            "seasonEnd": year_end,
            "seasonKey": f"{stat.get('seasonYearStart', year_end - 1)}-{year_end}",
            "competitionCode": stat.get("competitionCode", "EPL"),
            "appearances": int(stat.get("appearances", 0)),
            "starts": int(stat.get("starts", 0)),
            "minutesPlayed": int(stat.get("minutesPlayed", 0)),
            "goals": float(stat.get("goals", 0)),
            "assists": float(stat.get("assists", 0)),
            "shots": float(stat.get("shots", 0)),
            "shotsOnTarget": float(stat.get("shotsOnTarget", 0)),
            "tackles": float(stat.get("tackles", 0)),
            "interceptions": float(stat.get("interceptions", 0)),
            "clearances": float(stat.get("clearances", 0)),
            "aerialDuelsWon": float(stat.get("aerialDuelsWon", 0)),
            "saves": float(stat.get("saves", 0)),
            "goalsConceded": float(stat.get("goalsConceded", 0)),
            "cleanSheets": float(stat.get("cleanSheets", 0)),
            "yellowCards": float(stat.get("yellowCards", 0)),
            "redCards": float(stat.get("redCards", 0)),
            "keyPasses": float(stat.get("keyPasses", 0)),
            "passesCompleted": float(stat.get("passesCompleted", 0)),
            "groundDuelsWon": float(stat.get("groundDuelsWon", 0)),
            "dribblesSuccess": float(stat.get("dribblesSuccess", 0)),
            "expectedGoals": float(stat.get("expectedGoals", 0)) if stat.get("expectedGoals") is not None else None,
            "expectedAssists": float(stat.get("expectedAssists", 0)) if stat.get("expectedAssists") is not None else None,
            "age": age,
        }
        rows.append(row)

    full_df = pd.DataFrame(rows)

    # Time-aware split matching Phase 5 specifications
    train_df = full_df[full_df["seasonEnd"] <= 2023].copy()
    val_df = full_df[full_df["seasonEnd"] == 2024].copy()
    test_df = full_df[full_df["seasonEnd"] == 2025].copy()

    metadata = {
        "totalRows": len(full_df),
        "trainRows": len(train_df),
        "valRows": len(val_df),
        "testRows": len(test_df),
        "trainSeasons": sorted(train_df["seasonEnd"].unique().tolist()),
        "valSeasons": sorted(val_df["seasonEnd"].unique().tolist()),
        "testSeasons": sorted(test_df["seasonEnd"].unique().tolist()),
        "totalPlayers": full_df["playerId"].nunique(),
        "trainPlayers": train_df["playerId"].nunique(),
        "valPlayers": val_df["playerId"].nunique(),
        "testPlayers": test_df["playerId"].nunique(),
    }

    return full_df, train_df, val_df, test_df, metadata
