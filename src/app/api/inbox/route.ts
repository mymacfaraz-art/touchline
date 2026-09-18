import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const careerId = searchParams.get('careerId');

    if (!careerId) {
      return NextResponse.json({ success: false, error: 'careerId is required' }, { status: 400 });
    }

    const newsItems = await prisma.newsItem.findMany({
      where: { careerId },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    const messages = newsItems.map((item, index) => ({
      id: item.id,
      title: item.title,
      content: item.body,
      category: item.category || 'GENERAL',
      date: item.createdAt.toISOString(),
      isRead: index > 3,
      sender: item.sourceType || 'Club Office',
      priority: 'NORMAL',
    }));

    return NextResponse.json({ success: true, messages, unreadCount: messages.filter(m => !m.isRead).length });
  } catch (error: any) {
    console.error('Error fetching inbox:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
