'use client';

import { useEffect, useRef, useState } from 'react';
import type { PlanId } from '@/lib/types/plans';

type Plan = {
  id: PlanId;
  name: string;
  description: string;
  highlight?: boolean;
  priceId: string | null;
  amount: number | null;
  currency: string | null;
  interval: string | null;
  available: boolean;
};

function formatPrice(amount: number | null, currency: string | null) {
  if (amount == null || !currency) return '—';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function intervalLabel(interval: string | null) {
  if (interval === 'once') return 'one-time';
  if (interval === 'week') return '/week';
  if (interval === 'month') return '/month';
  if (interval === 'year') return '/year';
  return '';
}

type PricingPlansProps = {
  compact?: boolean;
  onCheckoutStart?: () => void;
  onCheckoutError?: (message: string) => void;
};

export function PricingPlans({
  compact = false,
  onCheckoutStart,
  onCheckoutError,
}: PricingPlansProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAgreed, setIsAgreed] = useState(false);
  const [trialHint, setTrialHint] = useState(false);
  const trialCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAgreed) {
      setTrialHint(false);
    }
  }, [isAgreed]);

  useEffect(() => {
    fetch('/api/stripe/plans')
      .then((res) => res.json())
      .then((data) => setPlans(data.plans ?? []))
      .catch(() => onCheckoutError?.('Unable to load pricing plans.'))
      .finally(() => setIsLoading(false));
  }, [onCheckoutError]);

  const handleSubscribe = async (plan: Plan) => {
    if (!plan.priceId || loadingPlan !== null) return;

    const needsAgreement = plan.id !== 'lifetime';
    if (needsAgreement && !isAgreed) {
      setTrialHint(true);
      trialCheckboxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      trialCheckboxRef.current?.focus();
      return;
    }

    setLoadingPlan(plan.id);
    onCheckoutStart?.();

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: plan.priceId }),
      });
      const { url, error } = await response.json();

      if (!response.ok || !url) {
        throw new Error(error ?? 'Unable to start checkout');
      }

      window.location.href = url;
    } catch (error) {
      onCheckoutError?.(
        error instanceof Error
          ? error.message
          : 'We could not start checkout. Please try again.',
      );
      setLoadingPlan(null);
    }
  };

  if (isLoading) {
    return (
      <div className={compact ? 'py-2' : 'py-8'}>
        <p className="text-center text-sm text-zinc-500">Loading plans...</p>
      </div>
    );
  }

  return (
    <div className={compact ? '' : 'py-4'}>
      {!compact && (
        <div className="mb-8 text-center">
          <h2 className="font-serif text-2xl text-slate-50">Choose your plan</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Start with a 3-day trial on weekly or monthly. Lifetime is a one-time purchase.
          </p>
        </div>
      )}
      <label
        className={`mb-6 flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
          trialHint
            ? 'border-amber-500/80 bg-amber-950/30 ring-2 ring-amber-500/40'
            : 'border-zinc-800 bg-zinc-900'
        }`}
      >
        <input
          ref={trialCheckboxRef}
          type="checkbox"
          checked={isAgreed}
          onChange={(e) => setIsAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-slate-100 focus:ring-zinc-500"
        />
        <span className="text-sm leading-relaxed text-zinc-300">
          I agree to the 3-day trial and the subscription terms.{' '}
          <span className="text-zinc-500">(Required for Weekly and Monthly)</span>
        </span>
      </label>
      {trialHint && !isAgreed && (
        <p className="-mt-4 mb-6 text-center text-sm text-amber-300">
          Check the agreement box above to enable Subscribe.
        </p>
      )}
      <div
        className={`grid gap-4 ${
          compact
            ? 'grid-cols-1 sm:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-3'
        }`}
      >
        {plans.map((plan) => {
          const needsAgreement = plan.id !== 'lifetime';
          const isDisabled =
            !plan.available ||
            loadingPlan !== null ||
            (needsAgreement && !isAgreed);

          return (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-2xl border-2 p-5 transition-shadow ${
              plan.highlight
                ? 'border-slate-300 bg-zinc-900 shadow-lg shadow-black/20'
                : 'border-zinc-800 bg-zinc-900/80'
            }`}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-100 px-3 py-0.5 text-xs font-medium text-zinc-950">
                Popular
              </span>
            )}
            <h3 className="font-serif text-lg text-slate-50">{plan.name}</h3>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-zinc-400">
              {plan.description}
            </p>
            <div className="mt-4 mb-4">
              <span className="text-2xl font-semibold text-slate-50">
                {formatPrice(plan.amount, plan.currency)}
              </span>
              <span className="text-sm text-zinc-500">
                {intervalLabel(plan.interval)}
              </span>
            </div>
            <button
              type="button"
              disabled={isDisabled}
              onClick={() => handleSubscribe(plan)}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                plan.highlight
                  ? 'bg-slate-100 text-zinc-950 hover:bg-white disabled:bg-zinc-600 disabled:text-zinc-300'
                  : 'border border-zinc-700 bg-zinc-950 text-slate-50 hover:bg-zinc-800'
              }`}
            >
              {loadingPlan === plan.id
                ? 'Opening checkout...'
                : plan.id === 'lifetime'
                  ? 'Buy lifetime'
                  : 'Subscribe'}
            </button>
          </div>
          );
        })}
      </div>
    </div>
  );
}
