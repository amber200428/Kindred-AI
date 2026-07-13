'use client';

import { useEffect, useState } from 'react';
import {
  FINANCIAL_DISCLAIMER_LABEL,
  FINANCIAL_QUICK_STARTS,
  FINANCIAL_WELCOME_MESSAGE,
} from '@/lib/prompts/financial-copilot';

export const FINANCIAL_DISCLAIMER_STORAGE_KEY =
  'kindred-financial-disclaimer-accepted';

type FinancialCategoryPanelProps = {
  disclaimerAccepted: boolean;
  onDisclaimerChange: (accepted: boolean) => void;
  onQuickStart: (prompt: string) => void;
  canSend: boolean;
  showWelcome: boolean;
};

export function FinancialCategoryPanel({
  disclaimerAccepted,
  onDisclaimerChange,
  onQuickStart,
  canSend,
  showWelcome,
}: FinancialCategoryPanelProps) {
  return (
    <div className="space-y-6">
      {showWelcome && (
        <div className="rounded-2xl border border-lime-800/50 bg-lime-950/20 p-6 shadow-sm">
          <p className="font-serif text-lg leading-relaxed text-lime-50">
            {FINANCIAL_WELCOME_MESSAGE}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {FINANCIAL_QUICK_STARTS.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={!canSend}
                onClick={() => onQuickStart(item.prompt)}
                className="rounded-xl border border-lime-700/60 bg-zinc-950/60 px-4 py-3 text-left text-sm font-medium text-lime-100 transition-colors hover:bg-lime-900/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
        <input
          type="checkbox"
          checked={disclaimerAccepted}
          onChange={(event) => onDisclaimerChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-lime-400 focus:ring-zinc-500"
        />
        <span className="text-sm leading-relaxed text-zinc-300">
          {FINANCIAL_DISCLAIMER_LABEL}
        </span>
      </label>
    </div>
  );
}

export function useFinancialDisclaimer() {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  useEffect(() => {
    setDisclaimerAccepted(
      window.localStorage.getItem(FINANCIAL_DISCLAIMER_STORAGE_KEY) === 'true',
    );
  }, []);

  const setDisclaimer = (accepted: boolean) => {
    setDisclaimerAccepted(accepted);
    if (accepted) {
      window.localStorage.setItem(FINANCIAL_DISCLAIMER_STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(FINANCIAL_DISCLAIMER_STORAGE_KEY);
    }
  };

  return { disclaimerAccepted, setDisclaimer };
}
