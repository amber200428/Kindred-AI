import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { JournalAppClient } from '@/components/JournalAppClient';
import { getChatForUser, getChatsForUser } from '@/lib/chats';
import { getMoodDataForCurrentUser } from '@/lib/mood';

type ChatPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const [chat, initialMoodData, historyItems] = await Promise.all([
    getChatForUser(id, userId),
    getMoodDataForCurrentUser().catch(() => []),
    getChatsForUser(userId),
  ]);

  if (!chat) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <JournalAppClient
        chatId={id}
        chatTitle={chat.title}
        initialMoodData={initialMoodData}
        historyItems={historyItems}
      />
    </Suspense>
  );
}
