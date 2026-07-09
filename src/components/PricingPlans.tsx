'use client';

import { useEffect, useState } from 'react';
import type { PlanId } from '@/lib/plans';

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
  const [acceptedTrial, setAcceptedTrial] = useState(false);

  useEffect(() => {
    fetch('/api/stripe/plans')
      .then((res) => res.json())
      .then((data) => setPlans(data.plans ?? []))
      .catch(() => onCheckoutError?.('Unable to load pricing plans.'))
      .finally(() => setIsLoading(false));
  }, [onCheckoutError]);

  const handleSelect = async (plan: Plan) => {
    if (!plan.priceId || !acceptedTrial) return;

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
        <p className="text-center text-sm text-stone-400">Loading plans...</p>
      </div>
    );
  }

  return (
    <div className={compact ? '' : 'py-4'}>
      {!compact && (
        <div className="mb-8 text-center">
          <h2 className="font-serif text-2xl text-stone-800">Choose your plan</h2>
          <p className="mt-2 text-sm text-stone-500">
            Start with a 3-day trial on weekly or monthly. Lifetime is a one-time purchase.
          </p>
        </div>
      )}
      <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
        <input
          type="checkbox"
          checked={acceptedTrial}
          onChange={(e) => setAcceptedTrial(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-stone-300 text-stone-800 focus:ring-stone-500"
        />
        <span className="text-sm leading-relaxed text-stone-600">
          I agree to the 3-day trial and the subscription terms.
        </span>
      </label>
      <div
        className={`grid gap-4 ${
          compact
            ? 'grid-cols-1 sm:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-3'
        }`}
      >
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-2xl border-2 p-5 transition-shadow ${
              plan.highlight
                ? 'border-stone-800 bg-white shadow-md'
                : 'border-stone-200 bg-white'
            }`}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-stone-800 px-3 py-0.5 text-xs font-medium text-white">
                Popular
              </span>
            )}
            <h3 className="font-serif text-lg text-stone-800">{plan.name}</h3>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-stone-500">
              {plan.description}
            </p>
            <div className="mt-4 mb-4">
              <span className="text-2xl font-semibold text-stone-800">
                {formatPrice(plan.amount, plan.currency)}
              </span>
              <span className="text-sm text-stone-500">
                {intervalLabel(plan.interval)}
              </span>
            </div>
            <button
              type="button"
              disabled={!plan.available || !acceptedTrial || loadingPlan !== null}
              onClick={() => handleSelect(plan)}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                plan.highlight
                  ? 'bg-stone-800 text-white hover:bg-stone-700'
                  : 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50'
              }`}
            >
              {loadingPlan === plan.id
                ? 'Opening checkout...'
                : plan.id === 'lifetime'
                  ? 'Buy lifetime'
                  : 'Subscribe'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
