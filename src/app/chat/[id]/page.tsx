import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { JournalApp } from '@/components/JournalApp';
import { getChatForUser, getChatsForUser } from '@/lib/chats';
import { getMessagesForChat } from '@/lib/chat-messages';
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

  const [chat, initialMessages, initialMoodData, historyItems] = await Promise.all([
    getChatForUser(id, userId),
    getMessagesForChat(id, userId),
    getMoodDataForCurrentUser().catch(() => []),
    getChatsForUser(userId).then((items) => items ?? []),
  ]);

  if (!chat) {
    redirect('/');
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <JournalApp
        key={id}
        chatId={id}
        chatTitle={chat.title}
        initialMessages={initialMessages}
        initialMoodData={initialMoodData}
        historyItems={historyItems}
      />
    </Suspense>
  );
}
