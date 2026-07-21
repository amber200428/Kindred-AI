export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  buildFallbackMessagesFromChatContent,
  getMessagesForChat,
} from '@/lib/chat-messages';
import { getChatForUser } from '@/lib/chats';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const chat = await getChatForUser(id, userId);
  if (!chat) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const loaded = await getMessagesForChat(id, userId);
  const messages =
    loaded.length > 0
      ? loaded
      : buildFallbackMessagesFromChatContent(chat.title, chat.content);

  return NextResponse.json({ messages });
}
