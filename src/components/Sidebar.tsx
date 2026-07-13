'use client';

import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { createNewChat } from '@/app/actions/chat';
import { UI } from '@/lib/labels';

const navButtonClass =
  'w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-left text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white';

export function Sidebar() {
  const router = useRouter();
  const { openUserProfile } = useClerk();

  const handleNewEntry = async () => {
    const response = await createNewChat();

    if (response && response.success) {
      router.refresh();
      router.push(`/chat/${response.id}`);
      return;
    }

    console.error('Failed to save:', response?.error);
    if (response?.error === 'User not authenticated') {
      router.push('/sign-in');
    }
  };

  return (
    <nav className="mb-6 flex flex-col gap-2">
      <button
        type="button"
        onClick={handleNewEntry}
        className={`${navButtonClass} border-emerald-400/50 bg-emerald-500/10 text-emerald-50 hover:border-emerald-400/50 hover:bg-emerald-500/20`}
      >
        {UI.NEW_ENTRY}
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
