'use client';

import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createNewChat } from '@/app/actions/chat';
import { UI } from '@/lib/labels';

const navButtonClass =
  'w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-left text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white';

type SidebarProps = {
  onNewEntry?: () => void;
};

export function Sidebar({ onNewEntry }: SidebarProps) {
  const router = useRouter();
  const { openUserProfile } = useClerk();
  const [isStarting, setIsStarting] = useState(false);

  const handleNewEntry = async () => {
    if (isStarting) return;

    setIsStarting(true);
    try {
      const response = await createNewChat();

      if (response.success) {
        onNewEntry?.();
        router.push(`/chat/${response.id}`);
        router.refresh();
        return;
      }

      if (response.error === UI.HISTORY_SAVE_UNAVAILABLE) {
        onNewEntry?.();
        router.push('/');
        router.refresh();
        return;
      }

      if (
        response.error === UI.AUTH_REQUIRED_TO_START ||
        response.error === 'User not authenticated'
      ) {
        router.push('/sign-in');
        return;
      }

      console.error('Failed to start new thought:', response.error);
      alert(`Could not start a new thought: ${response.error}`);
    } catch (error) {
      console.error('Failed to start new thought:', error);
      alert('Could not start a new thought. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <nav className="mb-6 flex flex-col gap-2">
      <button
        type="button"
        onClick={handleNewEntry}
        disabled={isStarting}
        className={`${navButtonClass} border-emerald-400/50 bg-emerald-500/10 text-emerald-50 hover:border-emerald-400/50 hover:bg-emerald-500/20 disabled:cursor-wait disabled:opacity-70`}
      >
        {isStarting ? 'Starting…' : UI.NEW_ENTRY}
      </button>

      <button
        type="button"
        onClick={() => openUserProfile()}
        className={navButtonClass}
      >
        {UI.SETTINGS}
      </button>
    </nav>
  );
}
