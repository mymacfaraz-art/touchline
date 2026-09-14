-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PreferredFoot" AS ENUM ('LEFT', 'RIGHT', 'BOTH');

-- CreateEnum
CREATE TYPE "PlayerPosition" AS ENUM ('GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST');

-- CreateEnum
CREATE TYPE "RegistrationType" AS ENUM ('PERMANENT', 'LOAN', 'FREE_AGENT_SIGNING', 'YOUTH_PROMOTION');

-- CreateEnum
CREATE TYPE "InjuryType" AS ENUM ('KNOCK', 'MUSCLE_STRAIN', 'LIGAMENT', 'FRACTURE', 'HEAD', 'FATIGUE_RELATED');

-- CreateEnum
CREATE TYPE "InjurySeverity" AS ENUM ('MINOR', 'MODERATE', 'SEVERE', 'CAREER_THREATENING');

-- CreateEnum
CREATE TYPE "SuspensionReason" AS ENUM ('YELLOW_CARD_ACCUMULATION', 'RED_CARD', 'MISCONDUCT');

-- CreateEnum
CREATE TYPE "PersonalityTrait" AS ENUM ('PROFESSIONAL', 'DETERMINED', 'MODEL_CITIZEN', 'TEMPERAMENTAL', 'UNAMBITIOUS', 'MERCENARY', 'LOYAL', 'MAVERICK');

-- CreateEnum
CREATE TYPE "AttributeChangeReason" AS ENUM ('TRAINING', 'MATCH_PERFORMANCE', 'AGE_PROGRESSION', 'AGE_DECLINE', 'INJURY_RECOVERY', 'COACHING_EFFECT', 'FACILITY_UPGRADE');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "CompetitionType" AS ENUM ('LEAGUE', 'DOMESTIC_CUP', 'CONTINENTAL_CUP', 'SUPER_CUP', 'FRIENDLY');

-- CreateEnum
CREATE TYPE "CompetitionFormat" AS ENUM ('ROUND_ROBIN', 'KNOCKOUT', 'GROUP_THEN_KNOCKOUT');

-- CreateEnum
CREATE TYPE "CompetitionPhaseType" AS ENUM ('LEAGUE_ROUNDS', 'GROUP', 'KNOCKOUT_ROUND', 'FINAL');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "MatchEventKind" AS ENUM ('KICK_OFF', 'HALF_TIME', 'FULL_TIME', 'AET', 'PENALTIES', 'GOAL', 'OWN_GOAL', 'PENALTY_GOAL', 'PENALTY_MISS', 'YELLOW_CARD', 'RED_CARD', 'SECOND_YELLOW', 'SUBSTITUTION', 'INJURY', 'VAR_REVIEW');

-- CreateEnum
CREATE TYPE "ClubFacilityLevel" AS ENUM ('POOR', 'BELOW_AVERAGE', 'AVERAGE', 'GOOD', 'EXCELLENT', 'WORLD_CLASS');

-- CreateEnum
CREATE TYPE "BoardAmbition" AS ENUM ('RELEGATION_BATTLE', 'SURVIVAL', 'MID_TABLE', 'PLAYOFF', 'PROMOTION', 'TITLE', 'EUROPEAN', 'CHAMPIONS_LEAGUE');

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "continent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manager" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "reputation" INTEGER NOT NULL DEFAULT 50,
    "isAI" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "clubId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "stadiumName" TEXT NOT NULL,
    "stadiumCapacity" INTEGER NOT NULL,
    "reputation" INTEGER NOT NULL DEFAULT 50,
    "domesticPrestige" INTEGER NOT NULL DEFAULT 50,
    "primaryColor" TEXT NOT NULL DEFAULT '#1a1a1a',
    "secondaryColor" TEXT NOT NULL DEFAULT '#ffffff',
    "founded" INTEGER,
    "isPlayerClub" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubSeasonState" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "gameSeasonId" TEXT NOT NULL,
    "transferBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wageBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "boardConfidence" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "fanHappiness" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "squadMorale" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "facilityLevel" "ClubFacilityLevel" NOT NULL DEFAULT 'AVERAGE',
    "boardAmbition" "BoardAmbition" NOT NULL DEFAULT 'MID_TABLE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubSeasonState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSeason" (
    "id" TEXT NOT NULL,
    "yearStart" INTEGER NOT NULL,
    "yearEnd" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CompetitionType" NOT NULL DEFAULT 'LEAGUE',
    "format" "CompetitionFormat" NOT NULL DEFAULT 'ROUND_ROBIN',
    "countryId" TEXT,
    "continent" TEXT,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "teamsCount" INTEGER NOT NULL DEFAULT 20,
    "hasPromotion" BOOLEAN NOT NULL DEFAULT false,
    "hasRelegation" BOOLEAN NOT NULL DEFAULT false,
    "promotionSpots" INTEGER NOT NULL DEFAULT 0,
    "relegationSpots" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionSeason" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "gameSeasonId" TEXT NOT NULL,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "winnerClubId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionPhase" (
    "id" TEXT NOT NULL,
    "competitionSeasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phaseType" "CompetitionPhaseType" NOT NULL DEFAULT 'LEAGUE_ROUNDS',
    "order" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonClubParticipation" (
    "id" TEXT NOT NULL,
    "competitionSeasonId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "drawn" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "goalsFor" INTEGER NOT NULL DEFAULT 0,
    "goalsAgainst" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "groupId" TEXT,
    "promotionStatus" TEXT,

    CONSTRAINT "SeasonClubParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "nationality" TEXT NOT NULL,
    "secondNationality" TEXT,
    "primaryPosition" "PlayerPosition" NOT NULL,
    "secondaryPositions" "PlayerPosition"[],
    "preferredFoot" "PreferredFoot" NOT NULL DEFAULT 'RIGHT',
    "height" INTEGER NOT NULL,
    "weight" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAttributes" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "passing" INTEGER NOT NULL DEFAULT 50,
    "longPassing" INTEGER NOT NULL DEFAULT 50,
    "crossing" INTEGER NOT NULL DEFAULT 50,
    "finishing" INTEGER NOT NULL DEFAULT 50,
    "firstTouch" INTEGER NOT NULL DEFAULT 50,
    "dribbling" INTEGER NOT NULL DEFAULT 50,
    "ballControl" INTEGER NOT NULL DEFAULT 50,
    "heading" INTEGER NOT NULL DEFAULT 50,
    "tackling" INTEGER NOT NULL DEFAULT 50,
    "marking" INTEGER NOT NULL DEFAULT 50,
    "freeKick" INTEGER NOT NULL DEFAULT 50,
    "penaltyTaking" INTEGER NOT NULL DEFAULT 50,
    "acceleration" INTEGER NOT NULL DEFAULT 50,
    "pace" INTEGER NOT NULL DEFAULT 50,
    "stamina" INTEGER NOT NULL DEFAULT 50,
    "strength" INTEGER NOT NULL DEFAULT 50,
    "agility" INTEGER NOT NULL DEFAULT 50,
    "balance" INTEGER NOT NULL DEFAULT 50,
    "jumping" INTEGER NOT NULL DEFAULT 50,
    "naturalFitness" INTEGER NOT NULL DEFAULT 50,
    "composure" INTEGER NOT NULL DEFAULT 50,
    "decisions" INTEGER NOT NULL DEFAULT 50,
    "vision" INTEGER NOT NULL DEFAULT 50,
    "anticipation" INTEGER NOT NULL DEFAULT 50,
    "positioning" INTEGER NOT NULL DEFAULT 50,
    "concentration" INTEGER NOT NULL DEFAULT 50,
    "workRate" INTEGER NOT NULL DEFAULT 50,
    "aggression" INTEGER NOT NULL DEFAULT 50,
    "leadership" INTEGER NOT NULL DEFAULT 50,
    "teamwork" INTEGER NOT NULL DEFAULT 50,
    "adaptability" INTEGER NOT NULL DEFAULT 50,
    "gkReflexes" INTEGER,
    "gkHandling" INTEGER,
    "gkPositioning" INTEGER,
    "gkKicking" INTEGER,
    "gkCommunication" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerAttributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerPotential" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "potentialAbility" INTEGER NOT NULL,
    "developmentRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "peakAgeStart" INTEGER NOT NULL DEFAULT 26,
    "peakAgeEnd" INTEGER NOT NULL DEFAULT 31,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerPotential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerPersonality" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "ambition" INTEGER NOT NULL DEFAULT 10,
    "professionalism" INTEGER NOT NULL DEFAULT 10,
    "loyalty" INTEGER NOT NULL DEFAULT 10,
    "temperament" INTEGER NOT NULL DEFAULT 10,
    "pressureHandling" INTEGER NOT NULL DEFAULT 10,
    "mediaHandling" INTEGER NOT NULL DEFAULT 10,
    "dominantTrait" "PersonalityTrait",

    CONSTRAINT "PlayerPersonality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerCondition" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gameSeasonId" TEXT NOT NULL,
    "fitness" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "fatigue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "morale" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "sharpness" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "form" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "tacticalFamiliarity" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerClubRegistration" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "gameSeasonId" TEXT NOT NULL,
    "registrationType" "RegistrationType" NOT NULL DEFAULT 'PERMANENT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "loanEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerClubRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerCompetitionStats" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "competitionSeasonId" TEXT NOT NULL,
    "appearances" INTEGER NOT NULL DEFAULT 0,
    "starts" INTEGER NOT NULL DEFAULT 0,
    "minutesPlayed" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "yellowCards" INTEGER NOT NULL DEFAULT 0,
    "redCards" INTEGER NOT NULL DEFAULT 0,
    "cleanSheets" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerCompetitionStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAttributeSnapshot" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gameSeasonId" TEXT NOT NULL,
    "attributeKey" TEXT NOT NULL,
    "previousValue" INTEGER NOT NULL,
    "newValue" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "changeReason" "AttributeChangeReason" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerAttributeSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerInjury" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "injuryType" "InjuryType" NOT NULL,
    "severity" "InjurySeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "expectedReturn" TIMESTAMP(3) NOT NULL,
    "actualReturn" TIMESTAMP(3),
    "matchId" TEXT,

    CONSTRAINT "PlayerInjury_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSuspension" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "reason" "SuspensionReason" NOT NULL,
    "matchesMissed" INTEGER NOT NULL,
    "matchesMissedRemaining" INTEGER NOT NULL,
    "competitionSeasonId" TEXT NOT NULL,
    "startedAtFixtureId" TEXT,

    CONSTRAINT "PlayerSuspension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "weeklyWage" DOUBLE PRECISION NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releaseClause" DOUBLE PRECISION,
    "signingBonus" DOUBLE PRECISION,
    "squadRole" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fixture" (
    "id" TEXT NOT NULL,
    "competitionPhaseId" TEXT NOT NULL,
    "homeClubId" TEXT NOT NULL,
    "awayClubId" TEXT NOT NULL,
    "matchDate" TIMESTAMP(3) NOT NULL,
    "matchWeek" INTEGER NOT NULL,
    "isNeutralVenue" BOOLEAN NOT NULL DEFAULT false,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fixture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "homeScore" INTEGER NOT NULL DEFAULT 0,
    "awayScore" INTEGER NOT NULL DEFAULT 0,
    "homeScoreHT" INTEGER NOT NULL DEFAULT 0,
    "awayScoreHT" INTEGER NOT NULL DEFAULT 0,
    "homeTacticsSnapshot" JSONB NOT NULL,
    "awayTacticsSnapshot" JSONB NOT NULL,
    "homeLineupSnapshot" JSONB NOT NULL,
    "awayLineupSnapshot" JSONB NOT NULL,
    "snapshotSchemaVersion" TEXT NOT NULL DEFAULT '1',
    "seed" TEXT NOT NULL,
    "simulationEngineVersion" TEXT NOT NULL,
    "simulatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchStatistics" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "homePossession" DOUBLE PRECISION NOT NULL,
    "awayPossession" DOUBLE PRECISION NOT NULL,
    "homeShots" INTEGER NOT NULL,
    "awayShots" INTEGER NOT NULL,
    "homeShotsOnTarget" INTEGER NOT NULL,
    "awayShotsOnTarget" INTEGER NOT NULL,
    "homeXg" DOUBLE PRECISION NOT NULL,
    "awayXg" DOUBLE PRECISION NOT NULL,
    "homePasses" INTEGER NOT NULL,
    "awayPasses" INTEGER NOT NULL,
    "homePassAccuracy" DOUBLE PRECISION NOT NULL,
    "awayPassAccuracy" DOUBLE PRECISION NOT NULL,
    "homeFouls" INTEGER NOT NULL,
    "awayFouls" INTEGER NOT NULL,
    "homeYellowCards" INTEGER NOT NULL,
    "awayYellowCards" INTEGER NOT NULL,
    "homeRedCards" INTEGER NOT NULL,
    "awayRedCards" INTEGER NOT NULL,
    "homeCorners" INTEGER NOT NULL,
    "awayCorners" INTEGER NOT NULL,
    "homeTackles" INTEGER NOT NULL,
    "awayTackles" INTEGER NOT NULL,
    "homeInterceptions" INTEGER NOT NULL,
    "awayInterceptions" INTEGER NOT NULL,

    CONSTRAINT "MatchStatistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "minute" INTEGER NOT NULL,
    "addedTime" INTEGER,
    "kind" "MatchEventKind" NOT NULL,
    "teamId" TEXT NOT NULL,
    "primaryPlayerId" TEXT,
    "secondaryPlayerId" TEXT,
    "xgValue" DOUBLE PRECISION,
    "metadata" JSONB,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerMatchPerformance" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "isStarting" BOOLEAN NOT NULL DEFAULT true,
    "minutesPlayed" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 6.0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "shots" INTEGER NOT NULL DEFAULT 0,
    "shotsOnTarget" INTEGER NOT NULL DEFAULT 0,
    "keyPasses" INTEGER NOT NULL DEFAULT 0,
    "passesCompleted" INTEGER NOT NULL DEFAULT 0,
    "passAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tackles" INTEGER NOT NULL DEFAULT 0,
    "interceptions" INTEGER NOT NULL DEFAULT 0,
    "aerialDuelsWon" INTEGER NOT NULL DEFAULT 0,
    "yellowCards" INTEGER NOT NULL DEFAULT 0,
    "redCards" INTEGER NOT NULL DEFAULT 0,
    "xg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "xgAssisted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wasSubstitutedOff" BOOLEAN NOT NULL DEFAULT false,
    "substitutedOffMinute" INTEGER,

    CONSTRAINT "PlayerMatchPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedTactic" (
    "id" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tacticDocument" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedTactic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE INDEX "Country_code_idx" ON "Country"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Manager_clubId_key" ON "Manager"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "Club_name_key" ON "Club"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Club_code_key" ON "Club"("code");

-- CreateIndex
CREATE INDEX "Club_code_idx" ON "Club"("code");

-- CreateIndex
CREATE INDEX "Club_countryId_idx" ON "Club"("countryId");

-- CreateIndex
CREATE INDEX "ClubSeasonState_gameSeasonId_idx" ON "ClubSeasonState"("gameSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubSeasonState_clubId_gameSeasonId_key" ON "ClubSeasonState"("clubId", "gameSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "GameSeason_yearStart_yearEnd_key" ON "GameSeason"("yearStart", "yearEnd");

-- CreateIndex
CREATE UNIQUE INDEX "Competition_code_key" ON "Competition"("code");

-- CreateIndex
CREATE INDEX "CompetitionSeason_gameSeasonId_idx" ON "CompetitionSeason"("gameSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionSeason_competitionId_gameSeasonId_key" ON "CompetitionSeason"("competitionId", "gameSeasonId");

-- CreateIndex
CREATE INDEX "CompetitionPhase_competitionSeasonId_idx" ON "CompetitionPhase"("competitionSeasonId");

-- CreateIndex
CREATE INDEX "CompetitionPhase_competitionSeasonId_order_idx" ON "CompetitionPhase"("competitionSeasonId", "order");

-- CreateIndex
CREATE INDEX "SeasonClubParticipation_competitionSeasonId_idx" ON "SeasonClubParticipation"("competitionSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonClubParticipation_competitionSeasonId_clubId_key" ON "SeasonClubParticipation"("competitionSeasonId", "clubId");

-- CreateIndex
CREATE INDEX "Player_primaryPosition_idx" ON "Player"("primaryPosition");

-- CreateIndex
CREATE INDEX "Player_isActive_idx" ON "Player"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAttributes_playerId_key" ON "PlayerAttributes"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerPotential_playerId_key" ON "PlayerPotential"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerPersonality_playerId_key" ON "PlayerPersonality"("playerId");

-- CreateIndex
CREATE INDEX "PlayerCondition_gameSeasonId_idx" ON "PlayerCondition"("gameSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCondition_playerId_gameSeasonId_key" ON "PlayerCondition"("playerId", "gameSeasonId");

-- CreateIndex
CREATE INDEX "PlayerClubRegistration_playerId_idx" ON "PlayerClubRegistration"("playerId");

-- CreateIndex
CREATE INDEX "PlayerClubRegistration_playerId_isActive_idx" ON "PlayerClubRegistration"("playerId", "isActive");

-- CreateIndex
CREATE INDEX "PlayerClubRegistration_clubId_isActive_idx" ON "PlayerClubRegistration"("clubId", "isActive");

-- CreateIndex
CREATE INDEX "PlayerCompetitionStats_playerId_idx" ON "PlayerCompetitionStats"("playerId");

-- CreateIndex
CREATE INDEX "PlayerCompetitionStats_competitionSeasonId_idx" ON "PlayerCompetitionStats"("competitionSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCompetitionStats_registrationId_competitionSeasonId_key" ON "PlayerCompetitionStats"("registrationId", "competitionSeasonId");

-- CreateIndex
CREATE INDEX "PlayerAttributeSnapshot_playerId_gameSeasonId_idx" ON "PlayerAttributeSnapshot"("playerId", "gameSeasonId");

-- CreateIndex
CREATE INDEX "PlayerAttributeSnapshot_playerId_attributeKey_idx" ON "PlayerAttributeSnapshot"("playerId", "attributeKey");

-- CreateIndex
CREATE INDEX "PlayerInjury_playerId_idx" ON "PlayerInjury"("playerId");

-- CreateIndex
CREATE INDEX "PlayerSuspension_playerId_idx" ON "PlayerSuspension"("playerId");

-- CreateIndex
CREATE INDEX "PlayerSuspension_competitionSeasonId_idx" ON "PlayerSuspension"("competitionSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_playerId_key" ON "Contract"("playerId");

-- CreateIndex
CREATE INDEX "Contract_clubId_idx" ON "Contract"("clubId");

-- CreateIndex
CREATE INDEX "Fixture_competitionPhaseId_idx" ON "Fixture"("competitionPhaseId");

-- CreateIndex
CREATE INDEX "Fixture_matchDate_idx" ON "Fixture"("matchDate");

-- CreateIndex
CREATE UNIQUE INDEX "Match_fixtureId_key" ON "Match"("fixtureId");

-- CreateIndex
CREATE INDEX "Match_simulatedAt_idx" ON "Match"("simulatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MatchStatistics_matchId_key" ON "MatchStatistics"("matchId");

-- CreateIndex
CREATE INDEX "MatchEvent_matchId_idx" ON "MatchEvent"("matchId");

-- CreateIndex
CREATE INDEX "PlayerMatchPerformance_playerId_idx" ON "PlayerMatchPerformance"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatchPerformance_matchId_playerId_key" ON "PlayerMatchPerformance"("matchId", "playerId");

-- CreateIndex
CREATE INDEX "SavedTactic_managerId_idx" ON "SavedTactic"("managerId");

-- AddForeignKey
ALTER TABLE "Manager" ADD CONSTRAINT "Manager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manager" ADD CONSTRAINT "Manager_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubSeasonState" ADD CONSTRAINT "ClubSeasonState_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubSeasonState" ADD CONSTRAINT "ClubSeasonState_gameSeasonId_fkey" FOREIGN KEY ("gameSeasonId") REFERENCES "GameSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionSeason" ADD CONSTRAINT "CompetitionSeason_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionSeason" ADD CONSTRAINT "CompetitionSeason_gameSeasonId_fkey" FOREIGN KEY ("gameSeasonId") REFERENCES "GameSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionSeason" ADD CONSTRAINT "CompetitionSeason_winnerClubId_fkey" FOREIGN KEY ("winnerClubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionPhase" ADD CONSTRAINT "CompetitionPhase_competitionSeasonId_fkey" FOREIGN KEY ("competitionSeasonId") REFERENCES "CompetitionSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonClubParticipation" ADD CONSTRAINT "SeasonClubParticipation_competitionSeasonId_fkey" FOREIGN KEY ("competitionSeasonId") REFERENCES "CompetitionSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonClubParticipation" ADD CONSTRAINT "SeasonClubParticipation_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAttributes" ADD CONSTRAINT "PlayerAttributes_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerPotential" ADD CONSTRAINT "PlayerPotential_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerPersonality" ADD CONSTRAINT "PlayerPersonality_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCondition" ADD CONSTRAINT "PlayerCondition_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCondition" ADD CONSTRAINT "PlayerCondition_gameSeasonId_fkey" FOREIGN KEY ("gameSeasonId") REFERENCES "GameSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerClubRegistration" ADD CONSTRAINT "PlayerClubRegistration_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerClubRegistration" ADD CONSTRAINT "PlayerClubRegistration_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerClubRegistration" ADD CONSTRAINT "PlayerClubRegistration_gameSeasonId_fkey" FOREIGN KEY ("gameSeasonId") REFERENCES "GameSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCompetitionStats" ADD CONSTRAINT "PlayerCompetitionStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCompetitionStats" ADD CONSTRAINT "PlayerCompetitionStats_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "PlayerClubRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCompetitionStats" ADD CONSTRAINT "PlayerCompetitionStats_competitionSeasonId_fkey" FOREIGN KEY ("competitionSeasonId") REFERENCES "CompetitionSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAttributeSnapshot" ADD CONSTRAINT "PlayerAttributeSnapshot_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAttributeSnapshot" ADD CONSTRAINT "PlayerAttributeSnapshot_gameSeasonId_fkey" FOREIGN KEY ("gameSeasonId") REFERENCES "GameSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerInjury" ADD CONSTRAINT "PlayerInjury_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerInjury" ADD CONSTRAINT "PlayerInjury_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSuspension" ADD CONSTRAINT "PlayerSuspension_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSuspension" ADD CONSTRAINT "PlayerSuspension_competitionSeasonId_fkey" FOREIGN KEY ("competitionSeasonId") REFERENCES "CompetitionSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSuspension" ADD CONSTRAINT "PlayerSuspension_startedAtFixtureId_fkey" FOREIGN KEY ("startedAtFixtureId") REFERENCES "Fixture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_competitionPhaseId_fkey" FOREIGN KEY ("competitionPhaseId") REFERENCES "CompetitionPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_homeClubId_fkey" FOREIGN KEY ("homeClubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_awayClubId_fkey" FOREIGN KEY ("awayClubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchStatistics" ADD CONSTRAINT "MatchStatistics_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_primaryPlayerId_fkey" FOREIGN KEY ("primaryPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_secondaryPlayerId_fkey" FOREIGN KEY ("secondaryPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMatchPerformance" ADD CONSTRAINT "PlayerMatchPerformance_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMatchPerformance" ADD CONSTRAINT "PlayerMatchPerformance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedTactic" ADD CONSTRAINT "SavedTactic_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

