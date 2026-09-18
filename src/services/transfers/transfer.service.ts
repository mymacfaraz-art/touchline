// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 8: TRANSFERS, CONTRACTS & SQUAD MANAGEMENT SERVICE
// Transactional transfers, loans, free agents, squad registration & eligibility
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../lib/prisma';
import { RegistrationType, ContractStatus } from '@prisma/client';

export interface TransferRequest {
  playerId: string;
  sourceClubId: string;
  destinationClubId: string;
  gameSeasonId: string;
  transferFee: number;
  weeklyWage: number;
  contractYears: number;
  effectiveDate?: Date;
  isLoan?: boolean;
  loanEndDate?: Date;
}

export interface ContractRenewalRequest {
  playerId: string;
  clubId: string;
  weeklyWage: number;
  contractYears: number;
  releaseClause?: number;
  squadRole?: string;
  effectiveDate?: Date;
}

export class TransferService {
  /**
   * Executes an atomic, transactional transfer of a player between clubs.
   * Updates registration, contracts, budget adjustments, and preserves historical records.
   */
  public async executeTransfer(params: TransferRequest): Promise<{
    transferId: string;
    newRegistrationId: string;
    newContractId: string;
  }> {
    const {
      playerId,
      sourceClubId,
      destinationClubId,
      gameSeasonId,
      transferFee,
      weeklyWage,
      contractYears,
      effectiveDate = new Date(),
      isLoan = false,
      loanEndDate,
    } = params;

    if (transferFee < 0 || weeklyWage < 0 || contractYears <= 0) {
      throw new Error('Invalid transfer parameters: fee and wage must be non-negative, contractYears > 0.');
    }

    return await prisma.$transaction(async (tx) => {
      // 0. Verify buyer club budget headroom
      if (transferFee > 0) {
        const destState = await tx.clubSeasonState.findUnique({
          where: { clubId_gameSeasonId: { clubId: destinationClubId, gameSeasonId } },
        });
        if (destState && destState.transferBudget < transferFee) {
          throw new Error(
            `Insufficient transfer budget: required £${transferFee}, available £${destState.transferBudget}.`
          );
        }
      }

      // 1. Verify player existence
      const player = await tx.player.findUnique({
        where: { id: playerId },
        include: {
          registrations: { where: { isActive: true } },
          contracts: { where: { status: 'ACTIVE' } },
        },
      });

      if (!player) {
        throw new Error(`Player '${playerId}' not found.`);
      }

      // 2. Verify source club registration
      const currentReg = player.registrations.find((r) => r.clubId === sourceClubId && r.isActive);
      if (!currentReg) {
        throw new Error(`Player is not actively registered with source club '${sourceClubId}'.`);
      }

      // 3. Deactivate previous registration
      await tx.playerClubRegistration.update({
        where: { id: currentReg.id },
        data: {
          isActive: false,
          endDate: effectiveDate,
        },
      });

      // 4. Terminate previous active contract
      const currentContract = player.contracts.find((c) => c.clubId === sourceClubId && c.status === 'ACTIVE');
      if (currentContract) {
        await tx.contract.update({
          where: { id: currentContract.id },
          data: { status: 'TERMINATED' },
        });
      }

      // 5. Create new registration
      const newReg = await tx.playerClubRegistration.create({
        data: {
          playerId,
          clubId: destinationClubId,
          gameSeasonId,
          registrationType: isLoan ? RegistrationType.LOAN : RegistrationType.PERMANENT,
          startDate: effectiveDate,
          endDate: isLoan ? loanEndDate : new Date(effectiveDate.getFullYear() + contractYears, 5, 30),
          loanEndDate: isLoan ? loanEndDate : null,
          isActive: true,
        },
      });

      // 6. Create new contract
      const expiresAt = new Date(effectiveDate.getFullYear() + contractYears, 5, 30);
      const newContract = await tx.contract.create({
        data: {
          playerId,
          clubId: destinationClubId,
          startDate: effectiveDate,
          expiresAt,
          weeklyWage,
          status: 'ACTIVE',
          squadRole: 'Regular Starter',
        },
      });

      // 7. Adjust budgets if ClubSeasonState exists
      if (transferFee > 0) {
        const destState = await tx.clubSeasonState.findUnique({
          where: { clubId_gameSeasonId: { clubId: destinationClubId, gameSeasonId } },
        });
        if (destState) {
          await tx.clubSeasonState.update({
            where: { id: destState.id },
            data: { transferBudget: Math.max(0, destState.transferBudget - transferFee) },
          });
        }

        const srcState = await tx.clubSeasonState.findUnique({
          where: { clubId_gameSeasonId: { clubId: sourceClubId, gameSeasonId } },
        });
        if (srcState) {
          await tx.clubSeasonState.update({
            where: { id: srcState.id },
            data: { transferBudget: srcState.transferBudget + transferFee },
          });
        }
      }

      return {
        transferId: `transfer-${Date.now()}`,
        newRegistrationId: newReg.id,
        newContractId: newContract.id,
      };
    });
  }

  /**
   * Signs a legitimate Free Agent (player with no active club registration).
   */
  public async signFreeAgent(params: {
    playerId: string;
    destinationClubId: string;
    gameSeasonId: string;
    weeklyWage: number;
    contractYears: number;
    signingBonus?: number;
    effectiveDate?: Date;
  }) {
    const {
      playerId,
      destinationClubId,
      gameSeasonId,
      weeklyWage,
      contractYears,
      signingBonus = 0,
      effectiveDate = new Date(),
    } = params;

    return await prisma.$transaction(async (tx) => {
      // Ensure no active registration exists
      const activeReg = await tx.playerClubRegistration.findFirst({
        where: { playerId, isActive: true },
      });

      if (activeReg) {
        throw new Error(`Player already has an active registration at club '${activeReg.clubId}'.`);
      }

      const expiresAt = new Date(effectiveDate.getFullYear() + contractYears, 5, 30);

      const reg = await tx.playerClubRegistration.create({
        data: {
          playerId,
          clubId: destinationClubId,
          gameSeasonId,
          registrationType: RegistrationType.FREE_AGENT_SIGNING,
          startDate: effectiveDate,
          endDate: expiresAt,
          isActive: true,
        },
      });

      const contract = await tx.contract.create({
        data: {
          playerId,
          clubId: destinationClubId,
          startDate: effectiveDate,
          expiresAt,
          weeklyWage,
          signingBonus,
          status: 'ACTIVE',
        },
      });

      return { registrationId: reg.id, contractId: contract.id };
    });
  }

  /**
   * Renews an existing player's contract with the same club.
   */
  public async renewContract(params: ContractRenewalRequest) {
    const { playerId, clubId, weeklyWage, contractYears, releaseClause, squadRole, effectiveDate = new Date() } = params;

    return await prisma.$transaction(async (tx) => {
      const activeContract = await tx.contract.findFirst({
        where: { playerId, clubId, status: 'ACTIVE' },
      });

      if (activeContract) {
        await tx.contract.update({
          where: { id: activeContract.id },
          data: { status: 'TERMINATED' },
        });
      }

      const expiresAt = new Date(effectiveDate.getFullYear() + contractYears, 5, 30);

      return await tx.contract.create({
        data: {
          playerId,
          clubId,
          startDate: effectiveDate,
          expiresAt,
          weeklyWage,
          releaseClause,
          squadRole,
          status: 'ACTIVE',
        },
      });
    });
  }
}

export class SquadManagementService {
  /**
   * Resolves the complete squad for a club in a specific season, distinguishing
   * starters, substitutes, reserves, injured, and suspended players.
   */
  public async getSquad(clubId: string, gameSeasonId: string, referenceDate: Date = new Date()) {
    const registrations = await prisma.playerClubRegistration.findMany({
      where: {
        clubId,
        gameSeasonId,
        isActive: true,
        startDate: { lte: referenceDate },
        OR: [{ endDate: null }, { endDate: { gte: referenceDate } }],
      },
      include: {
        player: {
          include: {
            attributes: true,
            injuries: {
              where: {
                startDate: { lte: referenceDate },
                actualReturn: null,
                expectedReturn: { gt: referenceDate },
              },
            },
            suspensions: {
              where: { matchesMissedRemaining: { gt: 0 } },
            },
            contracts: {
              where: { clubId, status: 'ACTIVE' },
              take: 1,
            },
          },
        },
      },
    });

    const conditions = await prisma.playerCondition.findMany({
      where: {
        gameSeasonId,
        playerId: { in: registrations.map((r) => r.playerId) },
      },
    });

    const conditionMap = new Map(conditions.map((c) => [c.playerId, c]));

    return registrations.map((reg) => {
      const p = reg.player;
      const cond = conditionMap.get(p.id);
      const isInjured = (p.injuries?.length ?? 0) > 0;
      const isSuspended = (p.suspensions?.length ?? 0) > 0;

      return {
        id: p.id,
        name: `${p.firstName} ${p.lastName}`.trim() || p.shortName,
        shortName: p.shortName,
        position: p.primaryPosition,
        nationality: p.nationality,
        registrationType: reg.registrationType,
        contractExpires: p.contracts?.[0]?.expiresAt ?? null,
        wage: p.contracts?.[0]?.weeklyWage ?? 0,
        fitness: cond?.fitness ?? 100,
        fatigue: cond?.fatigue ?? 0,
        form: cond?.form ?? 50,
        morale: cond?.morale ?? 75,
        isAvailable: !isInjured && !isSuspended,
        isInjured,
        isSuspended,
      };
    });
  }
}
