#!/usr/bin/env python3
"""
TOUCHLINE — PHASE 6: REPRODUCIBLE ML PIPELINE ENTRYPOINT
Executes end-to-end dataset loading, feature extraction, model selection, held-out testing,
calibration, rating predictions, and export file generation.
"""

import sys
import os

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.exports.exporter import run_pipeline_and_export

if __name__ == "__main__":
    print("🚀 Starting Touchline Phase 6 Reproducible ML Execution...")
    results = run_pipeline_and_export()
    print("✅ Touchline Phase 6 ML Pipeline execution completed successfully!")
