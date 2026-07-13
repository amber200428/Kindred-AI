export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getMessagesForChat } from '@/lib/financial-chat';

type RouteContext = {
  params: Promise<{ chatId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Please create an account or sign in to continue.' },
        { status: 401 },
      );
    }

    const { chatId } = await context.params;

    try {
      const messages = await getMessagesForChat(chatId, userId);
      return NextResponse.json({ chatId, messages });
    } catch (error) {
      if (error instanceof Error && error.message === 'CHAT_NOT_FOUND') {
        return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error('--- FINANCIAL MESSAGES GET ERROR ---', error);
    return NextResponse.json(
      { error: 'Unable to load chat history.' },
      { status: 500 },
    );
  }
}
