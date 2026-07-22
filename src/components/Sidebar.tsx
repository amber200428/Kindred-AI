'use client';

import { useClerk } from '@clerk/nextjs';
import { useState } from 'react';
import { STRIPE_CUSTOMER_PORTAL_URL, UI } from '@/lib/labels';

const navButtonClass =
  'w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-left text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white';

type SidebarProps = {
  onNewChat?: () => void;
};

export function Sidebar({ onNewChat }: SidebarProps) {
  const { openUserProfile } = useClerk();
  const [settingsOpen, setSettingsOpen] = useState(false);

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
        onClick={() => setSettingsOpen((open) => !open)}
        aria-expanded={settingsOpen}
        className={navButtonClass}
      >
        {UI.SETTINGS}
      </button>

      {settingsOpen && (
        <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
          <a
            href={STRIPE_CUSTOMER_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${navButtonClass} text-center`}
          >
            {UI.MANAGE_BILLING}
          </a>
          <button
            type="button"
            onClick={() => openUserProfile()}
            className={navButtonClass}
          >
            {UI.ACCOUNT_SETTINGS}
          </button>
        </div>
      )}
    </nav>
  );
}
