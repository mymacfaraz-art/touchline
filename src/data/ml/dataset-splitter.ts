// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: TEMPORAL DATASET SPLITTER & LEAKAGE PROTECTOR
// Enforces strict time-aware partitioning to prevent historical training data leakage.
// Prevents future statistics leaking backward, duplicate player-seasons, and global test scaling.
// ─────────────────────────────────────────────────────────────────────────────

import { MLFeatureVector } from './feature-definitions';

export interface DatasetSplitResult {
  train: MLFeatureVector[];
  validation: MLFeatureVector[];
  test: MLFeatureVector[];
  metadata: {
    trainSeasons: number[];
    valSeasons: number[];
    testSeasons: number[];
    trainCount: number;
    valCount: number;
    testCount: number;
    leakageCheckPassed: boolean;
    temporalMonotonicityPassed: boolean;
  };
}

export class DatasetSplitter {
  /**
   * Splits feature vectors into Train, Validation, and Held-Out Test partitions
   * based strictly on temporal season thresholds (time-aware splitting).
   *
   * @param vectors Array of ML feature vectors
   * @param trainMaxYear Latest seasonYearEnd for training (e.g. 2023)
   * @param valMaxYear Latest seasonYearEnd for validation (e.g. 2024)
   */
  public static splitTemporal(
    vectors: MLFeatureVector[],
    trainMaxYear = 2023,
    valMaxYear = 2024
  ): DatasetSplitResult {
    const train: MLFeatureVector[] = [];
    const validation: MLFeatureVector[] = [];
    const test: MLFeatureVector[] = [];

    const trainSeasons = new Set<number>();
    const valSeasons = new Set<number>();
    const testSeasons = new Set<number>();

    for (const vec of vectors) {
      const yearEnd = parseInt(vec.seasonKey.split('-')[1], 10);

      if (yearEnd <= trainMaxYear) {
        vec.splitRole = 'TRAIN';
        train.push(vec);
        trainSeasons.add(yearEnd);
      } else if (yearEnd <= valMaxYear) {
        vec.splitRole = 'VALIDATION';
        validation.push(vec);
        valSeasons.add(yearEnd);
      } else {
        vec.splitRole = 'TEST';
        test.push(vec);
        testSeasons.add(yearEnd);
      }
    }

    const sortedTrain = Array.from(trainSeasons).sort((a, b) => a - b);
    const sortedVal = Array.from(valSeasons).sort((a, b) => a - b);
    const sortedTest = Array.from(testSeasons).sort((a, b) => a - b);

    // 1. Leakage Validation: Assert no overlapping (playerId + seasonKey) across partitions
    const leakageCheckPassed = this.verifyNoLeakage(train, validation, test);

    // 2. Strict Temporal Monotonicity: max(train) < min(val) < min(test)
    let temporalMonotonicityPassed = true;
    if (sortedTrain.length > 0 && sortedVal.length > 0) {
      if (sortedTrain[sortedTrain.length - 1] >= sortedVal[0]) {
        temporalMonotonicityPassed = false;
        throw new Error(`Temporal leak: Train max season (${sortedTrain[sortedTrain.length - 1]}) >= Validation min season (${sortedVal[0]}).`);
      }
    }
    if (sortedVal.length > 0 && sortedTest.length > 0) {
      if (sortedVal[sortedVal.length - 1] >= sortedTest[0]) {
        temporalMonotonicityPassed = false;
        throw new Error(`Temporal leak: Validation max season (${sortedVal[sortedVal.length - 1]}) >= Test min season (${sortedTest[0]}).`);
      }
    }

    return {
      train,
      validation,
      test,
      metadata: {
        trainSeasons: sortedTrain,
        valSeasons: sortedVal,
        testSeasons: sortedTest,
        trainCount: train.length,
        valCount: validation.length,
        testCount: test.length,
        leakageCheckPassed,
        temporalMonotonicityPassed,
      },
    };
  }

  /**
   * Strictly verifies zero overlap of player-season records across split boundaries.
   */
  public static verifyNoLeakage(
    train: MLFeatureVector[],
    val: MLFeatureVector[],
    test: MLFeatureVector[]
  ): boolean {
    const trainKeys = new Set(train.map((v) => `${v.playerId}:${v.seasonKey}`));
    const valKeys = new Set(val.map((v) => `${v.playerId}:${v.seasonKey}`));

    for (const v of val) {
      if (trainKeys.has(`${v.playerId}:${v.seasonKey}`)) {
        throw new Error(`Data leakage detected: Player-season ${v.playerId}:${v.seasonKey} exists in both Train and Validation.`);
      }
    }

    for (const t of test) {
      const key = `${t.playerId}:${t.seasonKey}`;
      if (trainKeys.has(key) || valKeys.has(key)) {
        throw new Error(`Data leakage detected: Player-season ${key} exists in Test and a training/validation partition.`);
      }
    }

    return true;
  }
}
