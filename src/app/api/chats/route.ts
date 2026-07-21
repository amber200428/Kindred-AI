export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getChatsForUser } from '@/lib/chats';
import { UI } from '@/lib/labels';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getChatsForUser(userId);
  if (data === null) {
    return NextResponse.json(
      { error: UI.HISTORY_SAVE_UNAVAILABLE, data: [] },
      { status: 503 },
    );
  }

  return NextResponse.json({ data });
}
