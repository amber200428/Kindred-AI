'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import type { ChatTransport, UIMessage } from 'ai';
import { PricingPlans } from '@/components/PricingPlans';
import { saveReflection } from '@/app/actions/chat';
import { ChatBox } from '@/components/ChatBox';
import { ChatLayout } from '@/components/ChatLayout';
import { ReflectionPage } from '@/components/ReflectionPage';
import type { ChatHistoryItem } from '@/lib/types/chats';
import { type MoodDataPoint } from '@/lib/types/mood';
import { generateId } from '@/lib/generate-id';
import { UI } from '@/lib/labels';

const RATE_LIMIT_MESSAGE =
  "You've been reflecting deeply! Take a breather and try again in an hour.";
const LIMIT_REACHED_MESSAGE =
  "You've reached your limit of 5 free chats today. Please check back in 24 hours or subscribe for unlimited access.";

type JournalAppProps = {
  chatId?: string;
  chatTitle?: string;
  initialMoodData?: MoodDataPoint[];
  historyItems?: ChatHistoryItem[];
};

export function JournalApp({
  chatId: chatIdProp,
  chatTitle,
  initialMoodData = [],
  historyItems = [],
}: JournalAppProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activePersona, setActivePersona] = useState('relationships');
  const [input, setInput] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [systemNotice, setSystemNotice] = useState<string | null>(null);
  const [showUpgradeSuccess, setShowUpgradeSuccess] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatId, setChatId] = useState(
    () => chatIdProp ?? generateId(),
  );
  const chatIdRef = useRef(chatId);
  const [moodData, setMoodData] = useState<MoodDataPoint[]>(initialMoodData);

  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  const loadMoodData = async () => {
    try {
      const res = await fetch('/api/mood');
      const json = await res.json();
      if (res.ok) {
        setMoodData(json.data ?? []);
      }
    } catch {
      // Mood graph is non-critical; ignore fetch errors.
    }
  };

  useEffect(() => {
    setMoodData(initialMoodData);
  }, [initialMoodData]);

  useEffect(() => {
    if (chatIdProp) {
      setChatId(chatIdProp);
    }
  }, [chatIdProp]);

  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      setShowUpgradeSuccess(true);
      setSystemNotice(null);
      setShowPricing(false);
    }
    if (searchParams.get('upgrade') === 'canceled') {
      setShowPricing(true);
    }
  }, [searchParams]);

  const [chatTransport, setChatTransport] =
    useState<ChatTransport<UIMessage> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTransport() {
      const { DefaultChatTransport } = await import('ai');
      if (cancelled) return;

      setChatTransport(
        new DefaultChatTransport({
          body: { personaId: activePersona, isPrivate, chatId },
          fetch: async (input, init) => {
            const initBody =
              typeof init?.body === 'string' && init.body
                ? JSON.parse(init.body)
                : {};
            const res = await fetch(input, {
              ...init,
              body: JSON.stringify({
                ...initBody,
                personaId: activePersona,
                isPrivate,
                chatId: chatIdRef.current,
              }),
            });

            if (res.status === 403) {
              const data = (await res
                .clone()
                .json()
                .catch(() => ({}))) as { error?: string };
              alert(data.error ?? LIMIT_REACHED_MESSAGE);
              setSystemNotice(data.error ?? LIMIT_REACHED_MESSAGE);
              setShowPricing(true);
              return res;
            }

            if (res.ok) {
              loadMoodData();
            }

            return res;
          },
        }),
      );
    }

    loadTransport();

    return () => {
      cancelled = true;
    };
  }, [activePersona, isPrivate, chatId]);

  const { messages, sendMessage } = useChat({
    transport: chatTransport ?? undefined,
    onError: (error) => {
      if (error.message === RATE_LIMIT_MESSAGE) {
        setSystemNotice(RATE_LIMIT_MESSAGE);
      } else if (error.message === LIMIT_REACHED_MESSAGE) {
        setSystemNotice(LIMIT_REACHED_MESSAGE);
        setShowPricing(true);
      }
    },
  });

  useEffect(() => {
    if (!chatIdProp || !chatTransport || messages.length > 0) return;

    const key = `pendingMessage:${chatIdProp}`;
    const pending = sessionStorage.getItem(key);
    if (!pending) return;

    sessionStorage.removeItem(key);
    void sendMessage({ text: pending });
  }, [chatIdProp, chatTransport, messages.length, sendMessage]);

  const personas = [
    {
      id: 'lgbtq_partners',
      name: 'LGBTQ+ Partners',
      desc: 'Navigating same-sex relationship dynamics.',
      selected:
        'border-violet-400 bg-violet-500/15 text-white ring-2 ring-violet-400/20 shadow-[0_0_15px_rgba(139,92,246,0.15)] scale-105',
      unselected:
        'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-violet-500/50',
    },
    {
      id: 'mentor',
      name: 'The Mentor',
      desc: 'Wise, grounded, and focused on your personal growth.',
      selected:
        'border-emerald-400 bg-emerald-500/15 text-white ring-2 ring-emerald-400/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-105',
      unselected:
        'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-emerald-500/50',
    },
    {
      id: 'workplace',
      name: 'Workplace Bias',
      desc: 'Support for workplace discrimination and burnout.',
      selected:
        'border-sky-400 bg-sky-500/15 text-white ring-2 ring-sky-400/20 shadow-[0_0_15px_rgba(14,165,233,0.15)] scale-105',
      unselected:
        'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-sky-500/50',
    },
    {
      id: 'feminism',
      name: 'Feminist Guide',
      desc: 'Empowerment and dismantling systemic pressures.',
      selected:
        'border-rose-400 bg-rose-500/15 text-white ring-2 ring-rose-400/20 shadow-[0_0_15px_rgba(244,63,94,0.15)] scale-105',
      unselected:
        'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-rose-500/50',
    },
    {
      id: 'relationships',
      name: 'Relationships',
      desc: 'Romantic partnerships and deep friendships.',
      selected:
        'border-amber-400 bg-amber-500/15 text-white ring-2 ring-amber-400/20 shadow-[0_0_15px_rgba(245,158,11,0.15)] scale-105',
      unselected:
        'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-amber-500/50',
    },
    {
      id: 'body_image',
      name: 'Body Image',
      desc: 'Gentle support for body dysmorphia and neutrality.',
      selected:
        'border-teal-400 bg-teal-500/15 text-white ring-2 ring-teal-400/20 shadow-[0_0_15px_rgba(20,184,166,0.15)] scale-105',
      unselected:
        'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-teal-500/50',
    },
    {
      id: 'family',
      name: 'Family Conflict',
      desc: 'Setting boundaries and processing family dynamics.',
      selected:
        'border-orange-400 bg-orange-500/15 text-white ring-2 ring-orange-400/20 shadow-[0_0_15px_rgba(249,115,22,0.15)] scale-105',
      unselected:
        'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-orange-500/50',
    },
    {
      id: 'addiction',
      name: 'Substance Support',
      desc: 'Shame-free support for alcohol, THC, or nicotine.',
      selected:
        'border-indigo-400 bg-indigo-500/15 text-white ring-2 ring-indigo-400/20 shadow-[0_0_15px_rgba(99,102,241,0.15)] scale-105',
      unselected:
        'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-indigo-500/50',
    },
    {
      id: 'finance',
      name: 'Finance',
      desc: 'Budgeting frameworks and practical money guidance.',
      selected:
        'border-lime-400 bg-lime-500/15 text-white ring-2 ring-lime-400/20 shadow-[0_0_15px_rgba(132,204,22,0.15)] scale-105',
      unselected:
        'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-lime-500/50',
    },
  ];

  const handleUpgrade = () => {
    setShowPricing(true);
    setSystemNotice(null);
  };

  const handleSelectHistory = (id: string) => {
    router.push(`/chat/${id}`);
  };

  const handleSave = async () => {
    const text = input.trim();
    if (!text || isSubmitting) return;

    if (!chatTransport) {
      alert('Still connecting. Please wait a moment and try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const title = text.split('\n')[0].slice(0, 80) || UI.NEW_ENTRY;
      const currentChatId = chatIdProp ?? chatId;
      const response = await saveReflection(title, text, currentChatId);

      if (!response.success) {
        if (response.error === 'User not authenticated') {
          router.push('/sign-in');
          return;
        }

        const storageUnavailable =
          response.error.includes('Missing Supabase') ||
          response.error.includes('Database is not configured');

        if (storageUnavailable) {
          setInput('');
          await sendMessage({ text });
          setSystemNotice(
            'Your guide can still respond, but chat history is unavailable until Supabase is configured.',
          );
          return;
        }

        alert('Could not save: ' + response.error);
        return;
      }

      chatIdRef.current = response.id;
      if (response.id !== chatId) {
        setChatId(response.id);
      }
      setInput('');

      if (chatIdProp) {
        await sendMessage({ text });
        return;
      }

      sessionStorage.setItem(`pendingMessage:${response.id}`, text);
      router.push(`/chat/${response.id}`);
    } catch (error) {
      console.error('Submit failed:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSave();
  };

  return (
    <ChatLayout
      moodData={moodData}
      historyItems={historyItems}
      onDrawerOpen={loadMoodData}
      onSelectHistory={handleSelectHistory}
      footer={
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent p-6">
          <div className="pointer-events-auto mx-auto max-w-2xl">
            <label className="flex w-fit cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-slate-100 focus:ring-zinc-500"
              />
              <span className="text-sm text-zinc-300">
                Keep private
                <span className="block text-xs text-zinc-500">
                  Skip memory lookup for this session
                </span>
              </span>
            </label>
          </div>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-4xl p-6 font-sans">
        <div className="mb-12">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h1 className="text-3xl font-serif text-slate-50 text-center flex-1">
              {chatTitle ?? 'Choose your guide today'}
            </h1>
            <button
              type="button"
              onClick={() => setShowPricing((open) => !open)}
              className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-zinc-800 sm:text-sm"
            >
              {showPricing ? 'Hide plans' : 'View plans'}
            </button>
          </div>
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {personas.map((p, index) => (
              <button
                key={p.id}
                onClick={() => setActivePersona(p.id)}
                className={`flex min-h-[5.25rem] flex-col justify-center rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                  activePersona === p.id ? p.selected : p.unselected
                } ${
                  personas.length % 2 !== 0 && index === personas.length - 1
                    ? 'sm:col-span-2 sm:mx-auto sm:max-w-[calc(50%-0.5rem)] lg:col-span-1 lg:max-w-none'
                    : ''
                }`}
              >
                <h3
                  className={`text-base font-semibold ${activePersona === p.id ? 'text-white' : 'text-zinc-300'}`}
                >
                  {p.name}
                </h3>
                <p
                  className={`mt-1 text-xs leading-tight ${activePersona === p.id ? 'text-white/90' : 'text-zinc-500'}`}
                >
                  {p.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {(showPricing || systemNotice === LIMIT_REACHED_MESSAGE) && (
          <div className="mb-12 max-w-4xl mx-auto">
            <PricingPlans
              compact={systemNotice === LIMIT_REACHED_MESSAGE}
              onCheckoutError={(message) => setSystemNotice(message)}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="mb-24">
          <ReflectionPage
            chatBox={
              <ChatBox
                value={input}
                onChange={setInput}
                submitLabel={isSubmitting ? 'Saving…' : UI.SAVE}
                disabled={isSubmitting || !chatTransport}
              />
            }
          >
            <div className="space-y-6">
              {showUpgradeSuccess && (
                <div className="flex justify-center">
                  <div className="max-w-md rounded-2xl border border-emerald-800 bg-emerald-950/50 px-5 py-4 text-center shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                      Welcome back
                    </p>
                    <p className="mt-2 font-serif text-sm leading-relaxed text-emerald-100">
                      Your subscription is active. Keep reflecting whenever you are
                      ready.
                    </p>
                  </div>
                </div>
              )}
              {systemNotice && (
                <div className="flex justify-center">
                  <div className="max-w-md rounded-2xl border border-amber-800/80 bg-amber-950/40 px-5 py-4 text-center shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
                      Gentle reminder
                    </p>
                    <p className="mt-2 font-serif text-sm leading-relaxed text-amber-100">
                      {systemNotice}
                    </p>
                    {systemNotice === LIMIT_REACHED_MESSAGE && !showPricing && (
                      <button
                        type="button"
                        onClick={handleUpgrade}
                        className="mt-4 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-white"
                      >
                        View plans to continue
                      </button>
                    )}
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={m.role === 'user' ? 'text-right' : 'text-left'}
                >
                  <div
                    className={`inline-block max-w-[85%] rounded-2xl p-4 ${
                      m.role === 'user'
                        ? 'rounded-br-sm bg-slate-100 text-zinc-950'
                        : 'rounded-bl-sm border border-zinc-800 bg-zinc-900 text-slate-200 shadow-sm'
                    }`}
                  >
                    {m.parts.map((part, i) =>
                      part.type === 'text' ? (
                        <span key={i}>{part.text}</span>
                      ) : null,
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ReflectionPage>
        </form>
      </div>
    </ChatLayout>
  );
}
