import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import { JournalApp } from '@/components/JournalApp';
import { getChatsForUser } from '@/lib/chats';
import { getMoodDataForCurrentUser } from '@/lib/mood';
import type { ChatHistoryItem } from '@/lib/types/chats';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { userId } = await auth();

  let initialMoodData: Awaited<ReturnType<typeof getMoodDataForCurrentUser>> = [];
  let historyItems: ChatHistoryItem[] = [];

  try {
    [initialMoodData, historyItems] = await Promise.all([
      getMoodDataForCurrentUser(),
      userId ? getChatsForUser(userId).then((items) => items ?? []) : Promise.resolve([]),
    ]);
  } catch (error) {
    console.error('--- HOME PAGE DATA ERROR ---', error);
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <JournalApp
        key="home"
        initialMoodData={initialMoodData}
        historyItems={historyItems}
      />
    </Suspense>
  );
}
