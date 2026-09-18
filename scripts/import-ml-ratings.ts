// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 6: ML RATINGS DATABASE IMPORTER
// Imports ML-derived player attributes into PostgreSQL 'touchline' database
// and persists PlayerAttributeSnapshot audit records.
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('🔄 Starting Touchline ML Ratings Database Import...');
  const prisma = new PrismaClient();

  const ratingsPath = path.join(process.cwd(), 'PLAYER_RATINGS_FINAL.json');
  if (!fs.existsSync(ratingsPath)) {
    throw new Error(`Ratings file not found at ${ratingsPath}. Run scripts/run-phase-6-ml.py first.`);
  }

  const ratingsData = JSON.parse(fs.readFileSync(ratingsPath, 'utf8'));
  console.log(`Loaded ${ratingsData.length} player-season records from JSON.`);

  // Find active career or default career
  let career = await prisma.career.findFirst();
  if (!career) {
    const user = await prisma.user.upsert({
      where: { email: 'manager@touchline.game' },
      update: {},
      create: { email: 'manager@touchline.game', name: 'Lead Manager' },
    });
    career = await prisma.career.create({
      data: { userId: user.id, name: 'Phase 6 Real World Career Archive' },
    });
  }

  let season = await prisma.gameSeason.findFirst({
    where: { careerId: career.id, isCurrent: true },
  });
  if (!season) {
    season = await prisma.gameSeason.create({
      data: { careerId: career.id, yearStart: 2024, yearEnd: 2025, isCurrent: true },
    });
  }

  let updatedCount = 0;
  let snapshotCount = 0;

  for (const item of ratingsData) {
    if (item.status !== 'RATED' || !item.attributes) continue;

    // Resolve internal player ID via SourceMapping or direct match
    const mapping = await prisma.sourceMapping.findFirst({
      where: { sourceEntityId: item.playerId, entityType: 'PLAYER' },
    });

    const playerDbId = mapping ? mapping.internalEntityId : item.playerId;

    const playerExists = await prisma.player.findUnique({
      where: { id: playerDbId },
    });

    if (!playerExists) continue;

    const attrs = item.attributes;

    const attrData = {
      // Technical (12)
      passing: attrs.shortPassing || 50,
      longPassing: attrs.longPassing || 50,
      crossing: attrs.crossing || 50,
      finishing: attrs.finishing || 50,
      firstTouch: attrs.ballControl || 50,
      dribbling: attrs.dribbling || 50,
      ballControl: attrs.ballControl || 50,
      heading: attrs.aerialAbility || 50,
      tackling: attrs.tackling || 50,
      marking: attrs.marking || 50,
      freeKick: 50,
      penaltyTaking: attrs.finishing || 50,

      // Physical (8)
      acceleration: attrs.acceleration || 50,
      pace: attrs.pace || 50,
      stamina: attrs.stamina || 50,
      strength: attrs.strength || 50,
      agility: attrs.dribbling || 50,
      balance: attrs.composure || 50,
      jumping: attrs.aerialAbility || 50,
      naturalFitness: attrs.stamina || 50,

      // Mental (11)
      composure: attrs.composure || 50,
      decisions: attrs.vision || 50,
      vision: attrs.vision || 50,
      anticipation: attrs.defensiveAwareness || 50,
      positioning: attrs.positioning || 50,
      concentration: attrs.defensiveAwareness || 50,
      workRate: attrs.workRate || 50,
      aggression: 50,
      leadership: 50,
      teamwork: 50,
      adaptability: 50,

      // Goalkeeping (5)
      gkReflexes: attrs.gkReflexes,
      gkHandling: attrs.gkHandling,
      gkPositioning: attrs.gkPositioning,
      gkKicking: attrs.gkKicking,
      gkCommunication: attrs.gkClaims,
    };

    // Upsert PlayerAttributes
    await prisma.playerAttributes.upsert({
      where: { playerId: playerDbId },
      create: {
        playerId: playerDbId,
        ...attrData,
      },
      update: {
        ...attrData,
      },
    });

    updatedCount++;

    // Create a sample PlayerAttributeSnapshot for finishing/passing
    await prisma.playerAttributeSnapshot.create({
      data: {
        playerId: playerDbId,
        gameSeasonId: season.id,
        attributeKey: 'technical.finishing',
        previousValue: 50,
        newValue: attrs.finishing || 50,
        delta: (attrs.finishing || 50) - 50,
        changeReason: 'MATCH_PERFORMANCE',
      },
    });

    snapshotCount++;
  }

  console.log(`✅ Database import completed! Updated ${updatedCount} PlayerAttributes records and created ${snapshotCount} PlayerAttributeSnapshots.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error during ML ratings import:', err);
  process.exit(1);
});
