import { NextResponse } from 'next/server';
import { TransferService, SquadManagementService } from '@/services/transfers/transfer.service';

const transferService = new TransferService();
const squadManagementService = new SquadManagementService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const gameSeasonId = searchParams.get('gameSeasonId');

    if (clubId && gameSeasonId) {
      const squad = await squadManagementService.getSquad(clubId, gameSeasonId);
      return NextResponse.json({ success: true, squad });
    }

    return NextResponse.json({ success: false, error: 'clubId and gameSeasonId are required' }, { status: 400 });
  } catch (error: any) {
    console.error('Error fetching squad data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'execute_transfer') {
      const {
        playerId,
        sourceClubId,
        destinationClubId,
        gameSeasonId,
        transferFee,
        weeklyWage,
        contractYears,
        isLoan,
        loanEndDate,
      } = body;

      if (!playerId || !sourceClubId || !destinationClubId || !gameSeasonId) {
        return NextResponse.json({ success: false, error: 'Missing required transfer parameters' }, { status: 400 });
      }

      const transfer = await transferService.executeTransfer({
        playerId,
        sourceClubId,
        destinationClubId,
        gameSeasonId,
        transferFee: transferFee ? Number(transferFee) : 0,
        weeklyWage: weeklyWage ? Number(weeklyWage) : 5000,
        contractYears: contractYears ? Number(contractYears) : 3,
        isLoan: Boolean(isLoan),
        loanEndDate: loanEndDate ? new Date(loanEndDate) : undefined,
      });

      return NextResponse.json({ success: true, transfer });
    }

    if (action === 'sign_free_agent') {
      const {
        playerId,
        destinationClubId,
        gameSeasonId,
        weeklyWage,
        contractYears,
        signingBonus,
      } = body;

      if (!playerId || !destinationClubId || !gameSeasonId) {
        return NextResponse.json({ success: false, error: 'Missing required free agent parameters' }, { status: 400 });
      }

      const signing = await transferService.signFreeAgent({
        playerId,
        destinationClubId,
        gameSeasonId,
        weeklyWage: weeklyWage ? Number(weeklyWage) : 3000,
        contractYears: contractYears ? Number(contractYears) : 2,
        signingBonus: signingBonus ? Number(signingBonus) : 0,
      });

      return NextResponse.json({ success: true, signing });
    }

    if (action === 'renew_contract') {
      const { playerId, clubId, weeklyWage, contractYears, releaseClause, squadRole } = body;

      if (!playerId || !clubId || !weeklyWage || !contractYears) {
        return NextResponse.json({ success: false, error: 'Missing required contract renewal parameters' }, { status: 400 });
      }

      const renewal = await transferService.renewContract({
        playerId,
        clubId,
        weeklyWage: Number(weeklyWage),
        contractYears: Number(contractYears),
        releaseClause: releaseClause ? Number(releaseClause) : undefined,
        squadRole,
      });

      return NextResponse.json({ success: true, renewal });
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Error in transfer POST handler:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
