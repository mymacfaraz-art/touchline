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
    uniquePlayersTrain: number;
    uniquePlayersVal: number;
    uniquePlayersTest: number;
    leakageCheckPassed: boolean;
    temporalMonotonicityPassed: boolean;
    disjointSeasonsCheckPassed: boolean;
  };
}

export class DatasetSplitter {
  /**
   * Splits feature vectors into Train, Validation, and Held-Out Test partitions
   * based strictly on temporal season thresholds (time-aware splitting).
   *
   * @param vectors Array of ML feature vectors
   * @param trainMaxYear Latest seasonYearEnd for training (default 2023: includes 2022 and 2023 ending seasons)
   * @param valMaxYear Latest seasonYearEnd for validation (default 2024: includes 2024 ending season)
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

    const trainPlayers = new Set<string>();
    const valPlayers = new Set<string>();
    const testPlayers = new Set<string>();

    for (const vec of vectors) {
      const yearEnd = parseInt(vec.seasonKey.split('-')[1], 10);

      if (isNaN(yearEnd)) {
        throw new Error(`Invalid seasonKey format in feature vector: '${vec.seasonKey}'`);
      }

      if (yearEnd <= trainMaxYear) {
        vec.splitRole = 'TRAIN';
        train.push(vec);
        trainSeasons.add(yearEnd);
        trainPlayers.add(vec.playerId);
      } else if (yearEnd <= valMaxYear) {
        vec.splitRole = 'VALIDATION';
        validation.push(vec);
        valSeasons.add(yearEnd);
        valPlayers.add(vec.playerId);
      } else {
        vec.splitRole = 'TEST';
        test.push(vec);
        testSeasons.add(yearEnd);
        testPlayers.add(vec.playerId);
      }
    }

    const sortedTrain = Array.from(trainSeasons).sort((a, b) => a - b);
    const sortedVal = Array.from(valSeasons).sort((a, b) => a - b);
    const sortedTest = Array.from(testSeasons).sort((a, b) => a - b);

    // 1. Disjoint Seasons Verification: Assert no season appears in multiple partitions
    const disjointSeasonsCheckPassed = this.verifyDisjointSeasons(sortedTrain, sortedVal, sortedTest);

    // 2. Leakage Validation: Assert no overlapping (playerId + seasonKey) across partitions
    const leakageCheckPassed = this.verifyNoLeakage(train, validation, test);

    // 3. Strict Temporal Monotonicity: max(train) < min(val) < min(test)
    const temporalMonotonicityPassed = this.verifyMonotonicity(sortedTrain, sortedVal, sortedTest);

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
        uniquePlayersTrain: trainPlayers.size,
        uniquePlayersVal: valPlayers.size,
        uniquePlayersTest: testPlayers.size,
        leakageCheckPassed,
        temporalMonotonicityPassed,
        disjointSeasonsCheckPassed,
      },
    };
  }

  /**
   * Strictly verifies zero overlap of season years across Train, Validation, and Test partitions.
   */
  public static verifyDisjointSeasons(
    trainSeasons: number[],
    valSeasons: number[],
    testSeasons: number[]
  ): boolean {
    const trainSet = new Set(trainSeasons);
    const valSet = new Set(valSeasons);
    const testSet = new Set(testSeasons);

    for (const s of valSet) {
      if (trainSet.has(s)) {
        throw new Error(`Data leakage detected: Season ${s} exists in both Train and Validation partitions.`);
      }
    }

    for (const s of testSet) {
      if (trainSet.has(s)) {
        throw new Error(`Data leakage detected: Season ${s} exists in both Train and Test partitions.`);
      }
      if (valSet.has(s)) {
        throw new Error(`Data leakage detected: Season ${s} exists in both Validation and Test partitions.`);
      }
    }

    return true;
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
      const key = `${v.playerId}:${v.seasonKey}`;
      if (trainKeys.has(key)) {
        throw new Error(`Data leakage detected: Player-season ${key} exists in both Train and Validation partitions.`);
      }
    }

    for (const t of test) {
      const key = `${t.playerId}:${t.seasonKey}`;
      if (trainKeys.has(key)) {
        throw new Error(`Data leakage detected: Player-season ${key} exists in both Train and Test partitions.`);
      }
      if (valKeys.has(key)) {
        throw new Error(`Data leakage detected: Player-season ${key} exists in both Validation and Test partitions.`);
      }
    }

    return true;
  }

  /**
   * Strictly verifies chronological monotonicity: max(train) < min(val) < min(test).
   */
  public static verifyMonotonicity(
    trainSeasons: number[],
    valSeasons: number[],
    testSeasons: number[]
  ): boolean {
    if (trainSeasons.length > 0 && valSeasons.length > 0) {
      const maxTrain = trainSeasons[trainSeasons.length - 1];
      const minVal = valSeasons[0];
      if (maxTrain >= minVal) {
        throw new Error(`Temporal leak: Train max season (${maxTrain}) >= Validation min season (${minVal}).`);
      }
    }

    if (valSeasons.length > 0 && testSeasons.length > 0) {
      const maxVal = valSeasons[valSeasons.length - 1];
      const minTest = testSeasons[0];
      if (maxVal >= minTest) {
        throw new Error(`Temporal leak: Validation max season (${maxVal}) >= Test min season (${minTest}).`);
      }
    }

    return true;
  }
}
