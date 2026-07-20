'use client';

import { useClerk } from '@clerk/nextjs';
import { UI } from '@/lib/labels';

const navButtonClass =
  'w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-left text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white';

type SidebarProps = {
  onNewChat?: () => void;
};

export function Sidebar({ onNewChat }: SidebarProps) {
  const { openUserProfile } = useClerk();

  return (
    <nav className="mb-6 flex flex-col gap-2">
      <button
        type="button"
        onClick={onNewChat}
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
