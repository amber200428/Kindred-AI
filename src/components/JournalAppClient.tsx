'use client';

import { Suspense } from 'react';
import { JournalApp } from '@/components/JournalApp';
import type { ChatHistoryItem } from '@/lib/types/chats';
import type { MoodDataPoint } from '@/lib/types/mood';

type JournalAppClientProps = {
  chatId?: string;
  chatTitle?: string;
  initialMoodData?: MoodDataPoint[];
  historyItems?: ChatHistoryItem[];
};

function JournalAppFallback() {
  return <div className="min-h-screen bg-zinc-950" />;
}

export function JournalAppClient(props: JournalAppClientProps) {
  return (
    <Suspense fallback={<JournalAppFallback />}>
      <JournalApp {...props} />
    </Suspense>
  );
}
