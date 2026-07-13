'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChatSearch } from '@/components/ChatSearch';
import { MoodGraph } from '@/components/MoodGraph';
import { Sidebar } from '@/components/Sidebar';
import type { ChatHistoryItem } from '@/lib/types/chats';
import { UI } from '@/lib/labels';
import type { MoodDataPoint } from '@/lib/types/mood';

type ChatLayoutProps = {
  children: ReactNode;
  footer?: ReactNode;
  historyItems?: ChatHistoryItem[];
  moodData?: MoodDataPoint[];
  onSelectHistory?: (id: string) => void;
  onDrawerOpen?: () => void;
};

export function ChatLayout({
  children,
  footer,
  historyItems = [],
  moodData = [],
  onSelectHistory,
  onDrawerOpen,
}: ChatLayoutProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (isDrawerOpen) {
      onDrawerOpen?.();
    }
  }, [isDrawerOpen, onDrawerOpen]);

  const items = historyItems;

  const searchChats = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        title: item.label,
        content: item.content,
      })),
    [items],
  );

  return (
    <div className="relative flex min-h-0 flex-1 bg-zinc-950 text-slate-50">
      <div className="absolute left-4 top-4 z-40">
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="rounded-md border border-zinc-800 bg-zinc-900 p-2 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          aria-label={`Open ${UI.CHAT_HISTORY}`}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-80 transform flex-col border-r border-zinc-800 bg-zinc-900 p-4 transition-transform duration-300 ease-in-out ${
          isDrawerOpen
            ? 'translate-x-0 shadow-2xl shadow-emerald-900/20'
            : '-translate-x-full pointer-events-none'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-semibold tracking-wide text-zinc-200">
            {UI.CHAT_HISTORY}
          </span>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="p-1 text-zinc-400 transition-colors hover:text-white"
            aria-label={`Close ${UI.CHAT_HISTORY}`}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <Sidebar onNewEntry={() => setIsDrawerOpen(false)} />

        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            {UI.MOOD_LOG}
          </p>
          <MoodGraph data={moodData} compact />
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          <ChatSearch
            chats={searchChats}
            onSelect={(id) => {
              onSelectHistory?.(id);
              setIsDrawerOpen(false);
            }}
          />
          {items.length === 0 && (
            <p className="rounded-md p-2 text-sm text-zinc-500">
              No reflections yet. Start a new one above.
            </p>
          )}
        </div>
      </aside>

      <main className="relative flex w-full flex-1 flex-col pt-16">
        <div className="flex-1 overflow-y-auto pb-32">{children}</div>
        {footer}
      </main>
    </div>
  );
}
