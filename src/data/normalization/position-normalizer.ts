// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: POSITION NORMALIZER
// Maps source-specific position labels into Touchline's canonical position model.
// Preserves the original source label for provenance and auditing.
// ─────────────────────────────────────────────────────────────────────────────

import { PlayerPosition } from '../../domain/types/player';

export class PositionNormalizer {
  private static readonly POSITION_MAP: Record<string, PlayerPosition> = {
    // Goalkeepers
    gk: 'GK',
    goalkeeper: 'GK',
    keeper: 'GK',
    torwart: 'GK',
    portero: 'GK',
    portiere: 'GK',
    gardien: 'GK',

    // Central Defenders
    cb: 'CB',
    'centre-back': 'CB',
    'center back': 'CB',
    'central defender': 'CB',
    defender: 'CB',
    df: 'CB',
    sweeper: 'CB',
    innenverteidiger: 'CB',
    central: 'CB',

    // Fullbacks / Wingbacks
    lb: 'LB',
    'left-back': 'LB',
    'left back': 'LB',
    lwb: 'LWB',
    'left wing-back': 'LWB',
    'left wing back': 'LWB',
    rb: 'RB',
    'right-back': 'RB',
    'right back': 'RB',
    rwb: 'RWB',
    'right wing-back': 'RWB',
    'right wing back': 'RWB',

    // Midfielders
    dm: 'CDM',
    cdm: 'CDM',
    'defensive midfield': 'CDM',
    'defensive midfielder': 'CDM',
    cm: 'CM',
    'central midfield': 'CM',
    'central midfielder': 'CM',
    midfielder: 'CM',
    mf: 'CM',
    am: 'CAM',
    cam: 'CAM',
    'attacking midfield': 'CAM',
    'attacking midfielder': 'CAM',
    lm: 'LM',
    'left midfield': 'LM',
    'left midfielder': 'LM',
    rm: 'RM',
    'right midfield': 'RM',
    'right midfielder': 'RM',

    // Attackers / Wingers / Forwards
    lw: 'LW',
    'left wing': 'LW',
    'left winger': 'LW',
    rw: 'RW',
    'right wing': 'RW',
    'right winger': 'RW',
    winger: 'RW',
    st: 'ST',
    striker: 'ST',
    cf: 'CF',
    'centre-forward': 'CF',
    'center forward': 'CF',
    forward: 'ST',
    fw: 'ST',
    attacker: 'ST',
    sturmer: 'ST',
    delantero: 'ST',
    attaquant: 'ST',
  };

  private static readonly SECONDARY_POSITIONS_MAP: Partial<Record<PlayerPosition, PlayerPosition[]>> = {
    ST: ['CF'],
    CF: ['ST'],
    LW: ['LM'],
    RW: ['RM'],
    LM: ['LW'],
    RM: ['RW'],
    CAM: ['CM'],
    CM: ['CAM', 'CDM'],
    CDM: ['CM'],
    LB: ['LWB'],
    LWB: ['LB'],
    RB: ['RWB'],
    RWB: ['RB'],
    CB: [],
    GK: [],
  };

  /**
   * Normalizes an external position string to a canonical PlayerPosition.
   * If unrecognized, defaults to fallback (CM if outfield, or specified fallback).
   */
  public static normalizePosition(
    sourcePosition: string,
    fallback: PlayerPosition = 'CM'
  ): {
    normalizedPosition: PlayerPosition;
    secondaryPositions: PlayerPosition[];
    sourcePosition: string;
  } {
    if (!sourcePosition) {
      return {
        normalizedPosition: fallback,
        secondaryPositions: this.SECONDARY_POSITIONS_MAP[fallback] || [],
        sourcePosition: 'UNKNOWN',
      };
    }

    const key = sourcePosition.trim().toLowerCase().replace(/[_-]/g, ' ');
    const normalized = this.POSITION_MAP[key] || this.POSITION_MAP[sourcePosition.trim().toLowerCase()] || fallback;
    const secondaryPositions = this.SECONDARY_POSITIONS_MAP[normalized] || [];

    return {
      normalizedPosition: normalized,
      secondaryPositions,
      sourcePosition,
    };
  }

  /**
   * Returns whether a position is a goalkeeper position.
   */
  public static isGoalkeeper(position: PlayerPosition): boolean {
    return position === 'GK';
  }
}
