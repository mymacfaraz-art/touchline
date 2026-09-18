"""
TOUCHLINE — PHASE 6: EXPORTER & REPRODUCIBLE PIPELINE RUNNER
Runs the entire ML pipeline end-to-end, generates all required rating exports,
walkthroughs, reports, and audit documents.
"""

import json
import os
import pandas as pd
import numpy as np
from typing import Dict, Any, List

from ml.data.dataset import load_dataset
from ml.features.feature_builder import build_features, FEATURE_COLUMNS
from ml.models.target_builder import construct_latent_targets, ATTRIBUTE_DOMAINS
from ml.features.preprocessor import Preprocessor
from ml.training.trainer import ModelTrainer, POSITION_GROUPS
from ml.inference.predictor import RatingPredictor, MODEL_VERSION, FEATURE_VERSION, DATASET_VERSION, CALIBRATION_VERSION
from ml.evaluation.evaluator import evaluate_held_out_test, compute_ratings_distribution

def run_pipeline_and_export() -> Dict[str, Any]:
    print("🤖 1. Loading Phase 5 Verified Dataset...")
    full_df, train_df, val_df, test_df, dataset_meta = load_dataset()

    print("📊 2. Constructing Latent Targets & Feature Matrices...")
    full_df = build_features(full_df)
    full_df = construct_latent_targets(full_df)

    train_df = build_features(train_df)
    train_df = construct_latent_targets(train_df)

    val_df = build_features(val_df)
    val_df = construct_latent_targets(val_df)

    test_df = build_features(test_df)
    test_df = construct_latent_targets(test_df)

    print("🔒 3. Fitting Scaler EXCLUSIVELY on Train Set (<=2023)...")
    preprocessor = Preprocessor()
    preprocessor.fit(train_df)

    print("🏋️ 4. Training Model Candidates & Selecting Best via Validation Set (2024)...")
    trainer = ModelTrainer(random_state=42)
    best_models, eval_results = trainer.train_and_select(train_df, val_df)
    trainer.save_artifacts()

    print("🧪 5. Evaluating ONCE on Held-Out Test Set (2024/25)...")
    test_results = evaluate_held_out_test(best_models, test_df)

    print("🔮 6. Performing Rating Inference & Calibration...")
    predictor = RatingPredictor(best_models)
    predictions = predictor.predict_dataframe(full_df)

    dist_stats = compute_ratings_distribution(predictions)

    print("📝 7. Generating Export Files...")
    export_dir = "ml/exports"
    os.makedirs(export_dir, exist_ok=True)

    # 1. PLAYER_RATINGS_FINAL.json
    with open("PLAYER_RATINGS_FINAL.json", "w", encoding="utf-8") as f:
        json.dump(predictions, f, indent=2)

    # 2. PLAYER_RATINGS_FINAL.csv
    csv_rows = []
    for p in predictions:
        row = {
            "statId": p["statId"],
            "playerId": p["playerId"],
            "playerName": p["playerName"],
            "primaryPosition": p["primaryPosition"],
            "positionGroup": p["positionGroup"],
            "clubName": p["clubName"],
            "seasonKey": p["seasonKey"],
            "status": p["status"],
            "ovr": p["ovr"] if p["ovr"] is not None else "",
            "confidence": p["confidence"],
            "minutesPlayed": p["minutesPlayed"],
            "appearances": p["appearances"],
        }
        for k, v in p.get("attributes", {}).items():
            row[k] = v
        csv_rows.append(row)

    player_ratings_df = pd.DataFrame(csv_rows)
    player_ratings_df.to_csv("PLAYER_RATINGS_FINAL.csv", index=False)

    # 3. PLAYER_RATINGS_FINAL.md
    generate_player_ratings_markdown("PLAYER_RATINGS_FINAL.md", predictions)

    # 4. TEAM RATINGS (CSV & MD)
    team_stats = compute_team_ratings(predictions)
    generate_team_ratings_files("TEAM_RATINGS_FINAL.csv", "TEAM_RATINGS_FINAL.md", team_stats, predictions)

    # 5. TOUCHLINE_RATINGS_COMPLETE.md
    generate_complete_touchline_ratings("TOUCHLINE_RATINGS_COMPLETE.md", predictions)

    # 6. PHASE_6_MODEL_REPORT.md
    generate_model_report("PHASE_6_MODEL_REPORT.md", dataset_meta, eval_results, test_results, dist_stats)

    # Return summary dict
    return {
        "dataset_meta": dataset_meta,
        "dist_stats": dist_stats,
        "test_results": test_results,
        "eval_results": eval_results,
        "total_predictions": len(predictions),
    }

def generate_player_ratings_markdown(filepath: str, predictions: List[Dict[str, Any]]):
    rated = [p for p in predictions if p["status"] == "RATED"]
    unrated = [p for p in predictions if p["status"] == "UNRATED"]

    # Sort rated players by OVR descending
    rated_sorted = sorted(rated, key=lambda x: (x["ovr"] or 0), reverse=True)

    lines = [
        "# TOUCHLINE — FINAL PLAYER RATINGS EXPORT",
        f"**Model Version**: `{MODEL_VERSION}` | **Dataset**: `{DATASET_VERSION}`",
        f"**Total Players Sourced**: {len(predictions)} | **Rated Players**: {len(rated)} | **Unrated Players**: {len(unrated)}",
        "",
        "## 1. RATED PLAYERS (Top Rated)",
        "| Rank | Player Name | Pos | Club | Season | OVR | Conf | Key Attributes (FIN/PAS/DEF/DRI/PHY) |",
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
    ]

    for i, p in enumerate(rated_sorted[:500], 1):  # Show top 500 in markdown overview
        attrs = p.get("attributes", {})
        key_str = f"F:{attrs.get('finishing', 0)} P:{attrs.get('shortPassing', 0)} D:{attrs.get('tackling', 0)} DR:{attrs.get('dribbling', 0)} PH:{attrs.get('stamina', 0)}"
        lines.append(f"| {i} | {p['playerName']} | {p['primaryPosition']} | {p['clubName']} | {p['seasonKey']} | **{p['ovr']}** | {p['confidence']:.2f} | {key_str} |")

    if unrated:
        lines.extend([
            "",
            "## 2. UNRATED / INSUFFICIENT DATA PLAYERS",
            "| Player Name | Pos | Club | Season | Minutes | Reason |",
            "| :--- | :--- | :--- | :--- | :--- | :--- |"
        ])
        for p in unrated[:100]:
            lines.append(f"| {p['playerName']} | {p['primaryPosition']} | {p['clubName']} | {p['seasonKey']} | {p['minutesPlayed']} | {p['unratedReason']} |")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

def compute_team_ratings(predictions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    club_players = {}
    for p in predictions:
        club = p["clubName"]
        if club:
            club_players.setdefault(club, []).append(p)

    team_list = []
    for club, players in club_players.items():
        rated_squad = [p for p in players if p["status"] == "RATED"]
        if not rated_squad:
            team_list.append({
                "clubName": club,
                "squadSize": len(players),
                "ratedCount": 0,
                "squadAverageOvr": None,
                "startingXiAverageOvr": None,
                "highestPlayer": None,
                "highestOvr": None,
                "lowestPlayer": None,
                "lowestOvr": None,
                "squadConfidence": 0.10,
                "status": "UNRATED / INSUFFICIENT DATA"
            })
            continue

        ovrs = [p["ovr"] for p in rated_squad]
        sorted_players = sorted(rated_squad, key=lambda x: x["ovr"], reverse=True)

        squad_avg = float(np.mean(ovrs))
        starting_xi_avg = float(np.mean([p["ovr"] for p in sorted_players[:11]])) if len(sorted_players) >= 11 else squad_avg
        confs = [p["confidence"] for p in rated_squad]

        team_list.append({
            "clubName": club,
            "squadSize": len(players),
            "ratedCount": len(rated_squad),
            "squadAverageOvr": round(squad_avg, 1),
            "startingXiAverageOvr": round(starting_xi_avg, 1),
            "highestPlayer": sorted_players[0]["playerName"],
            "highestOvr": sorted_players[0]["ovr"],
            "lowestPlayer": sorted_players[-1]["playerName"],
            "lowestOvr": sorted_players[-1]["ovr"],
            "squadConfidence": round(float(np.mean(confs)), 2),
            "status": "RATED"
        })

    return sorted(team_list, key=lambda x: (x["startingXiAverageOvr"] or 0), reverse=True)

def generate_team_ratings_files(csv_path: str, md_path: str, team_stats: List[Dict[str, Any]], predictions: List[Dict[str, Any]]):
    df = pd.DataFrame(team_stats)
    df.to_csv(csv_path, index=False)

    lines = [
        "# TOUCHLINE — TEAM RATINGS EXPORT",
        f"**Model Version**: `{MODEL_VERSION}` | **Total Teams**: {len(team_stats)}",
        "",
        "| Rank | Club Name | Squad Size | Rated Count | Starting XI OVR | Squad Avg OVR | Star Player (OVR) | Squad Confidence |",
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
    ]

    for i, t in enumerate(team_stats, 1):
        if t["status"] == "RATED":
            lines.append(f"| {i} | {t['clubName']} | {t['squadSize']} | {t['ratedCount']} | **{t['startingXiAverageOvr']}** | {t['squadAverageOvr']} | {t['highestPlayer']} ({t['highestOvr']}) | {t['squadConfidence']} |")
        else:
            lines.append(f"| {i} | {t['clubName']} | {t['squadSize']} | 0 | N/A | N/A | N/A | {t['squadConfidence']} (UNRATED) |")

    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

def generate_complete_touchline_ratings(filepath: str, predictions: List[Dict[str, Any]]):
    grouped = {}
    for p in predictions:
        comp = p.get("competitionCode", "EPL")
        club = p.get("clubName", "Free Agent")
        grouped.setdefault(comp, {}).setdefault(club, []).append(p)

    lines = [
        "==================================================",
        "TOUCHLINE COMPLETE PLAYER RATINGS DIRECTORY",
        f"Model: {MODEL_VERSION}",
        f"Dataset: {DATASET_VERSION}",
        "==================================================",
        ""
    ]

    for comp, clubs in sorted(grouped.items()):
        lines.append(f"COMPETITION: {comp}")
        lines.append("=" * 40)

        for club, players in sorted(clubs.items()):
            lines.append(f"\n  CLUB: {club}")
            lines.append("  " + "-" * 35)

            sorted_p = sorted(players, key=lambda x: (x.get("ovr") or 0), reverse=True)
            for p in sorted_p:
                if p["status"] == "RATED":
                    attrs = p.get("attributes", {})
                    lines.append(f"    - {p['playerName']} ({p['primaryPosition']}) — OVR: {p['ovr']} [Conf: {p['confidence']:.2f}]")
                    lines.append(f"      Finishing: {attrs.get('finishing', 0)} | ShortPass: {attrs.get('shortPassing', 0)} | Tackling: {attrs.get('tackling', 0)} | Dribbling: {attrs.get('dribbling', 0)} | Stamina: {attrs.get('stamina', 0)}")
                else:
                    lines.append(f"    - {p['playerName']} ({p['primaryPosition']}) — UNRATED ({p['unratedReason']})")
        lines.append("\n")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

def generate_model_report(filepath: str, meta: Dict[str, Any], eval_res: Dict[str, Any], test_res: Dict[str, Any], dist: Dict[str, Any]):
    lines = [
        "# TOUCHLINE — PHASE 6 MODEL REPORT",
        "## AI/ML PLAYER ATTRIBUTE & OVERALL RATING ENGINE",
        "",
        "### 1. Dataset & Partition Summary",
        f"- **Total Rows Ingested**: {meta['totalRows']}",
        f"- **Train Rows (<=2023)**: {meta['trainRows']} (Seasons: {meta['trainSeasons']})",
        f"- **Validation Rows (2024)**: {meta['valRows']} (Seasons: {meta['valSeasons']})",
        f"- **Held-Out Test Rows (2025)**: {meta['testRows']} (Seasons: {meta['testSeasons']})",
        f"- **Total Unique Players**: {meta['totalPlayers']}",
        "",
        "### 2. Latent Target & Position-Aware Architecture",
        "- **Target Strategy**: Statistically grounded latent domain targets constructed from per-90 metrics, conversion rates, and empirical-Bayes shrinkage ($w = \\text{mins}/(\\text{mins}+450)$).",
        "- **Position Groups**: `GOALKEEPER`, `DEFENDER`, `MIDFIELDER`, `ATTACKER`.",
        "",
        "### 3. Validation & Model Selection Results (2023/24)",
    ]

    for pg, domains in eval_res.items():
        lines.append(f"#### Position Group: {pg}")
        for domain, res in domains.items():
            sel = res["selected_model"]
            best_mae = res["best_val_mae"]
            lines.append(f"- **{domain}**: Selected `{sel}` (Validation MAE: {best_mae:.4f})")

    lines.extend([
        "",
        "### 4. Held-Out Test Evaluation Results (2024/25)",
        "| Position Group | Attribute Domain | Selected Model | Test MAE | Test RMSE | Test R² | Sample Count |",
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
    ])

    for pg, domains in test_res.items():
        for domain, res in domains.items():
            lines.append(f"| {pg} | {domain} | `{res['model_name']}` | {res['test_mae']:.4f} | {res['test_rmse']:.4f} | {res['test_r2']:.4f} | {res['sample_count']} |")

    lines.extend([
        "",
        "### 5. Final Ratings Distribution Statistics",
        f"- **Total Players Evaluated**: {dist['total_players']}",
        f"- **Total Rated Players**: {dist['total_rated']}",
        f"- **Total Unrated Players**: {dist['total_unrated']}",
        f"- **OVR Range**: Min = {dist['ovr_min']} | Max = {dist['ovr_max']} | Mean = {dist['ovr_mean']:.1f} | Median = {dist['ovr_median']:.1f} | Std = {dist['ovr_std']:.2f}",
        f"- **Confidence Range**: Min = {dist['conf_min']:.2f} | Max = {dist['conf_max']:.2f} | Mean = {dist['conf_mean']:.2f}",
        "",
        "#### OVR Distribution Bands",
    ])

    for band, count in dist.get("ovr_bands", {}).items():
        lines.append(f"- **{band}**: {count} players")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
