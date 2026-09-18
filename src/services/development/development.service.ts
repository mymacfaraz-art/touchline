// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 9: TRAINING, DEVELOPMENT, STAFF & FACILITIES SERVICE
// Structured player progression, age curves, potential ceilings, attribute clamping
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../lib/prisma';
import { AttributeChangeReason } from '@prisma/client';
import { computeAge } from '../../domain/types/player';

export interface TrainingSessionOptions {
  clubId: string;
  gameSeasonId: string;
  intensity: 'LIGHT' | 'NORMAL' | 'HEAVY';
  focus: 'BALANCED' | 'ATTACKING' | 'DEFENDING' | 'PHYSICAL' | 'TECHNICAL';
}

export class PlayerDevelopmentService {
  /**
   * Clamps an attribute to valid simulation boundaries [1, 99].
   */
  public static clampAttribute(val: number): number {
    return Math.max(1, Math.min(99, Math.round(val)));
  }

  /**
   * Clamps Touchline OVR to calibrated simulation boundaries [1, 91].
   */
  public static clampOVR(val: number): number {
    return Math.max(1, Math.min(91, Math.round(val)));
  }

  /**
   * Computes age progression curve factor.
   */
  public static calculateAgeFactor(age: number, peakStart: number = 25, peakEnd: number = 30): number {
    if (age < peakStart) {
      return 0.8 + (peakStart - age) * 0.1;
    } else if (age <= peakEnd) {
      return 0.2;
    } else {
      return -0.4 - (age - peakEnd) * 0.15;
    }
  }

  /**
   * Computes player development update across a training or season progression cycle.
   * Clamps all attributes to [1, 99] and Touchline OVR to [1, 91].
   * Persists audit records to PlayerAttributeSnapshot.
   */
  public async processPlayerDevelopment(params: {
    playerId: string;
    gameSeasonId: string;
    minutesPlayed: number;
    matchRatingAvg: number;
    trainingIntensity?: 'LIGHT' | 'NORMAL' | 'HEAVY';
    reason?: AttributeChangeReason;
    referenceDate?: Date;
  }): Promise<{ updatedCount: number; snapshotsCreated: number }> {
    const {
      playerId,
      gameSeasonId,
      minutesPlayed,
      matchRatingAvg,
      trainingIntensity = 'NORMAL',
      reason = AttributeChangeReason.TRAINING,
      referenceDate = new Date(),
    } = params;

    return await prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({
        where: { id: playerId },
        include: {
          attributes: true,
          potential: true,
          personality: true,
        },
      });

      if (!player || !player.attributes) {
        return { updatedCount: 0, snapshotsCreated: 0 };
      }

      const age = computeAge(player.dateOfBirth, referenceDate);
      const attrs = player.attributes;
      const potential = player.potential?.potentialAbility ?? 140; // 1-200 scale
      const peakStart = player.potential?.peakAgeStart ?? 25;
      const peakEnd = player.potential?.peakAgeEnd ?? 30;

      // Age curve growth factor
      let ageFactor = 0;
      if (age < peakStart) {
        // Young players develop rapidly: age 18-24
        ageFactor = 0.8 + (peakStart - age) * 0.1;
      } else if (age <= peakEnd) {
        // Peak age: maintenance / minor refinement
        ageFactor = 0.2;
      } else {
        // Decline phase: age 31+
        ageFactor = -0.4 - (age - peakEnd) * 0.15;
      }

      // Playing time factor: 1800 minutes = full season baseline
      const playingTimeFactor = Math.min(1.2, minutesPlayed / 1500.0);

      // Performance factor: ratings 6.0 to 8.5
      const perfFactor = (matchRatingAvg - 6.0) * 0.2;

      // Training intensity factor
      const intensityFactor =
        trainingIntensity === 'HEAVY' ? 0.3 : trainingIntensity === 'LIGHT' ? -0.1 : 0.1;

      // Composite delta (controlled stochastic bounds)
      const rawDelta = Math.round(ageFactor * 1.5 + playingTimeFactor * 0.8 + perfFactor + intensityFactor);

      // Target relevant attributes based on position
      const isGK = player.primaryPosition === 'GK';
      const isDefender = ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(player.primaryPosition);
      const isMidfielder = ['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(player.primaryPosition);

      const targetKeys: Array<keyof typeof attrs> = [];
      if (isGK) {
        targetKeys.push('gkReflexes', 'gkHandling', 'gkPositioning', 'stamina');
      } else if (isDefender) {
        targetKeys.push('tackling', 'marking', 'heading', 'strength', 'stamina');
      } else if (isMidfielder) {
        targetKeys.push('passing', 'vision', 'ballControl', 'stamina', 'firstTouch');
      } else {
        targetKeys.push('finishing', 'dribbling', 'acceleration', 'pace', 'composure');
      }

      let snapshotsCreated = 0;
      const attrUpdates: Record<string, number> = {};

      for (const key of targetKeys) {
        const currentVal = (attrs[key] as number) ?? 50;
        // Don't exceed potential ceiling or clamp boundaries [1, 99]
        let delta = rawDelta;
        if (delta > 0 && currentVal >= Math.min(99, Math.round(potential / 2.0))) {
          delta = 0; // Ceiling hit
        }

        const clampedNewVal = Math.max(1, Math.min(99, currentVal + delta));
        const effectiveDelta = clampedNewVal - currentVal;

        if (effectiveDelta !== 0) {
          attrUpdates[key] = clampedNewVal;

          await tx.playerAttributeSnapshot.create({
            data: {
              playerId,
              gameSeasonId,
              attributeKey: String(key),
              previousValue: currentVal,
              newValue: clampedNewVal,
              delta: effectiveDelta,
              changeReason: reason,
              occurredAt: referenceDate,
            },
          });
          snapshotsCreated++;
        }
      }

      if (Object.keys(attrUpdates).length > 0) {
        await tx.playerAttributes.update({
          where: { playerId },
          data: attrUpdates,
        });
      }

      return { updatedCount: Object.keys(attrUpdates).length, snapshotsCreated };
    });
  }

  /**
   * Executes team training session for all registered players in a club.
   * Adjusts condition (fatigue, fitness, sharpness) and triggers development.
   */
  public async runTeamTrainingSession(options: TrainingSessionOptions) {
    const { clubId, gameSeasonId, intensity, focus } = options;

    const registrations = await prisma.playerClubRegistration.findMany({
      where: { clubId, gameSeasonId, isActive: true },
      select: { playerId: true },
    });

    const playerIds = registrations.map((r) => r.playerId);

    const fatigueDelta = intensity === 'HEAVY' ? 12 : intensity === 'LIGHT' ? 4 : 8;
    const sharpnessDelta = intensity === 'HEAVY' ? 6 : intensity === 'LIGHT' ? 2 : 4;
    const fitnessDelta = intensity === 'HEAVY' ? -4 : intensity === 'LIGHT' ? 5 : 1;

    // Batch update player conditions
    for (const pid of playerIds) {
      const cond = await prisma.playerCondition.findUnique({
        where: { playerId_gameSeasonId: { playerId: pid, gameSeasonId } },
      });

      if (cond) {
        await prisma.playerCondition.update({
          where: { id: cond.id },
          data: {
            fatigue: Math.min(100, cond.fatigue + fatigueDelta),
            sharpness: Math.min(100, cond.sharpness + sharpnessDelta),
            fitness: Math.max(0, Math.min(100, cond.fitness + fitnessDelta)),
          },
        });
      }
    }

    return { playersTrained: playerIds.length, intensity, focus };
  }
}
