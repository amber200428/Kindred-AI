'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { VoiceInput } from '@/components/VoiceInput';
import { getGratitudeShift } from '@/lib/gratitude';
import { UI } from '@/lib/labels';
import { getDailyPrompt } from '@/lib/prompts';

type ChatBoxProps = {
  value: string;
  onChange: (text: string) => void;
  submitLabel?: string;
  disabled?: boolean;
};

export function ChatBox({
  value,
  onChange,
  submitLabel = UI.SAVE,
  disabled = false,
}: ChatBoxProps) {
  const [placeholder, setPlaceholder] = useState('');

  useEffect(() => {
    setPlaceholder(getDailyPrompt());
  }, []);

  const handleGratitudeShift = () => {
    setPlaceholder(getGratitudeShift());
  };

  return (
    <div className="mx-auto mt-6 w-full max-w-2xl">
      <div className="relative rounded-xl border border-zinc-700 bg-zinc-900 p-4">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          autoComplete="off"
          autoCorrect="on"
          enterKeyHint="done"
          className="w-full resize-none bg-transparent text-base text-white placeholder-zinc-500 focus:outline-none"
        />

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleGratitudeShift}
            className="rounded p-1 text-zinc-500 transition-colors hover:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            title="Gratitude Shift"
            aria-label="Show a gratitude shift prompt"
          >
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2">
            <VoiceInput onTextUpdate={onChange} />
            <button
              type="submit"
              disabled={disabled || !value.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
