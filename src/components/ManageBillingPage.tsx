'use client';

import { STRIPE_CUSTOMER_PORTAL_URL, UI } from '@/lib/labels';

export function BillingIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

export function ManageBillingPage() {
  return (
    <div className="flex flex-col gap-4 p-1 text-sm">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          {UI.MANAGE_BILLING}
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Update your payment method, view invoices, or cancel your plan in the
          Stripe customer portal.
        </p>
      </div>
      <a
        href={STRIPE_CUSTOMER_PORTAL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-slate-100 dark:text-zinc-950 dark:hover:bg-white"
      >
        {UI.MANAGE_BILLING}
      </a>
    </div>
  );
}
