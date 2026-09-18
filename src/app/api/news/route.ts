import { NextResponse } from 'next/server';
import { NewsService } from '@/services/news/news.service';
import { NarrativeService } from '@/narrative/narrative.service';

const newsService = new NewsService();
const narrativeService = new NarrativeService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const careerId = searchParams.get('careerId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (careerId) {
      const news = await newsService.getLatestNews(careerId, limit);
      return NextResponse.json({ success: true, news });
    }

    return NextResponse.json({ success: false, error: 'careerId is required' }, { status: 400 });
  } catch (error: any) {
    console.error('Error fetching news:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'generate_match_report') {
      const { context } = body;
      if (!context) {
        return NextResponse.json({ success: false, error: 'Missing narrative context' }, { status: 400 });
      }

      const report = await narrativeService.generateMatchReport(context);
      return NextResponse.json({ success: true, report });
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Error in news POST handler:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
