'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { PricingPlans } from '@/components/PricingPlans';

const RATE_LIMIT_MESSAGE =
  "You've been reflecting deeply! Take a breather and try again in an hour.";
const LIMIT_REACHED_MESSAGE =
  "You've reached your limit of 5 free chats today. Please check back in 24 hours or subscribe for unlimited access.";

function JournalApp() {
  const searchParams = useSearchParams();
  const [activePersona, setActivePersona] = useState('relationships');
  const [input, setInput] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [systemNotice, setSystemNotice] = useState<string | null>(null);
  const [showUpgradeSuccess, setShowUpgradeSuccess] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

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

  const { messages, sendMessage } = useChat({
    transport: useMemo(
      () =>
        new DefaultChatTransport({
          body: { personaId: activePersona, isPrivate },
          fetch: async (input, init) => {
            const res = await fetch(input, init);

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

            return res;
          },
        }),
      [activePersona, isPrivate],
    ),
    onError: (error) => {
      if (error.message === RATE_LIMIT_MESSAGE) {
        setSystemNotice(RATE_LIMIT_MESSAGE);
      }
    },
  });

  const personas = [
    { id: 'lgbtq_partners', name: 'LGBTQ+ Partners', desc: 'Navigating same-sex relationship dynamics.', color: 'bg-violet-100 border-violet-300', text: 'text-violet-900' },
    { id: 'mentor', name: 'The Mentor', desc: 'Wise, grounded, and focused on your personal growth.', color: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-900' },
    { id: 'workplace', name: 'Workplace Bias', desc: 'Support for workplace discrimination and burnout.', color: 'bg-slate-100 border-slate-300', text: 'text-slate-900' },
    { id: 'feminism', name: 'Feminist Guide', desc: 'Empowerment and dismantling systemic pressures.', color: 'bg-rose-100 border-rose-300', text: 'text-rose-900' },
    { id: 'relationships', name: 'Relationships', desc: 'Romantic partnerships and deep friendships.', color: 'bg-amber-100 border-amber-300', text: 'text-amber-900' },
    { id: 'body_image', name: 'Body Image', desc: 'Gentle support for body dysmorphia and neutrality.', color: 'bg-teal-100 border-teal-300', text: 'text-teal-900' },
    { id: 'family', name: 'Family Conflict', desc: 'Setting boundaries and processing family dynamics.', color: 'bg-orange-100 border-orange-300', text: 'text-orange-900' },
    { id: 'addiction', name: 'Substance Support', desc: 'Shame-free support for alcohol, THC, or nicotine.', color: 'bg-indigo-100 border-indigo-300', text: 'text-indigo-900' },
  ];

  const handleUpgrade = () => {
    setShowPricing(true);
    setSystemNotice(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSystemNotice(null);
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFBF7] font-sans pb-24">
      <div className="max-w-4xl mx-auto w-full p-6">
        
        <div className="mb-12">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h1 className="text-3xl font-serif text-stone-800 text-center flex-1">
              Choose your guide today
            </h1>
            <button
              type="button"
              onClick={() => setShowPricing((open) => !open)}
              className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 sm:text-sm"
            >
              {showPricing ? 'Hide plans' : 'View plans'}
            </button>
          </div>
          {/* Updated Grid: 2 columns on small screens, 4 columns on large screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {personas.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePersona(p.id)}
                className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                  activePersona === p.id 
                    ? `${p.color} shadow-md transform scale-105` 
                    : 'bg-white border-stone-100 hover:border-stone-200 opacity-60'
                }`}
              >
                <h3 className={`text-base font-semibold ${p.text}`}>{p.name}</h3>
                <p className="text-stone-600 mt-1 text-xs leading-tight">{p.desc}</p>
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

        <div className="max-w-2xl mx-auto space-y-6 mb-8">
          {messages.length === 0 && !systemNotice && (
            <p className="text-center text-stone-400 italic font-serif mt-12">
              Take a deep breath. What is on your mind?
            </p>
          )}
          {showUpgradeSuccess && (
            <div className="flex justify-center">
              <div className="max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Welcome back
                </p>
                <p className="mt-2 font-serif text-sm leading-relaxed text-emerald-900">
                  Your subscription is active. Keep reflecting whenever you are ready.
                </p>
              </div>
            </div>
          )}
          {systemNotice && (
            <div className="flex justify-center">
              <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-center shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Gentle reminder
                </p>
                <p className="mt-2 font-serif text-sm leading-relaxed text-amber-900">
                  {systemNotice}
                </p>
                {systemNotice === LIMIT_REACHED_MESSAGE && !showPricing && (
                  <button
                    type="button"
                    onClick={handleUpgrade}
                    className="mt-4 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700"
                  >
                    View plans to continue
                  </button>
                )}
              </div>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <div className={`inline-block p-4 rounded-2xl max-w-[85%] ${
                m.role === 'user' 
                  ? 'bg-stone-800 text-white rounded-br-sm' 
                  : 'bg-white border border-stone-200 text-stone-700 rounded-bl-sm shadow-sm'
              }`}>
                {m.parts.map((part, i) =>
                  part.type === 'text' ? <span key={i}>{part.text}</span> : null
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="fixed bottom-0 w-full bg-gradient-to-t from-[#FDFBF7] via-[#FDFBF7] to-transparent p-6">
        <div className="max-w-2xl mx-auto space-y-3">
          <label className="flex items-center gap-3 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-stone-800 focus:ring-stone-500"
            />
            <span className="text-sm text-stone-600">
              Keep private
              <span className="block text-xs text-stone-400">
                Skip memory lookup for this session
              </span>
            </span>
          </label>
          <div className="relative">
            <input
              className="w-full p-4 pr-24 outline-none rounded-xl border border-stone-300 shadow-sm focus:ring-2 focus:ring-stone-500 bg-white text-black placeholder-black"
              value={input}
              placeholder="Start journaling here..."
              onChange={(e) => setInput(e.target.value)}
            />
            <button 
              type="submit"
              className="absolute right-2 top-2 bottom-2 px-4 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors font-medium text-sm"
            >
              Reflect
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDFBF7]" />}>
      <JournalApp />
    </Suspense>
  );
}
