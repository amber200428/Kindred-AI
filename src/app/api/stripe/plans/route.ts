export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  PLAN_IDS,
  PLAN_LABELS,
  createUnavailablePlans,
  getMissingStripeEnvVars,
  getPriceIdForPlan,
} from '@/lib/plans';
import { getStripe } from '@/lib/stripe';

function stripeConfigResponse(
  plans: ReturnType<typeof createUnavailablePlans>,
  extra: Record<string, unknown> = {},
) {
  const missingEnvVars = getMissingStripeEnvVars();

  return NextResponse.json({
    plans,
    configured: missingEnvVars.length === 0,
    missingEnvVars,
    ...extra,
  });
}

export async function GET() {
  const missingEnvVars = getMissingStripeEnvVars();

  if (missingEnvVars.length > 0) {
    console.error(
      '--- STRIPE PLANS ERROR --- missing env vars:',
      missingEnvVars.join(', '),
    );

    return NextResponse.json(
      {
        error: 'Stripe not configured',
        missingEnvVars,
        plans: createUnavailablePlans(),
        configured: false,
      },
      { status: 404 },
    );
  }

  try {
    let hasModeMismatch = false;

    const plans = await Promise.all(
      PLAN_IDS.map(async (planId) => {
        const priceId = getPriceIdForPlan(planId);
        const label = PLAN_LABELS[planId];

        if (!priceId) {
          console.error(`Missing Stripe price env for plan: ${planId}`);
          return {
            id: planId,
            ...label,
            priceId: null,
            amount: null,
            currency: null,
            interval: null,
            available: false,
          };
        }

        try {
          const price = await getStripe().prices.retrieve(priceId);

          return {
            id: planId,
            ...label,
            priceId,
            amount: price.unit_amount,
            currency: price.currency,
            interval:
              planId === 'lifetime'
                ? 'once'
                : (price.recurring?.interval ?? null),
            available: true,
          };
        } catch (priceError) {
          console.error(`--- STRIPE PRICE ERROR (${planId}) ---`, priceError);

          const stripeMessage =
            priceError instanceof Error ? priceError.message : String(priceError);
          const modeMismatch =
            stripeMessage.includes('No such price') ||
            stripeMessage.includes('a similar object exists in test mode') ||
            stripeMessage.includes('a similar object exists in live mode');

          if (modeMismatch) {
            hasModeMismatch = true;
          }

          return {
            id: planId,
            ...label,
            priceId,
            amount: null,
            currency: null,
            interval: null,
            available: false,
          };
        }
      }),
    );

    const stripeKey = process.env.STRIPE_SECRET_KEY ?? '';
    const stripeMode = stripeKey.startsWith('sk_live_')
      ? 'live'
      : stripeKey.startsWith('sk_test_')
        ? 'test'
        : 'unknown';

    return NextResponse.json({
      plans,
      configured: getMissingStripeEnvVars().length === 0 && plans.some((p) => p.available),
      missingEnvVars: getMissingStripeEnvVars(),
      stripeMode,
      hint: hasModeMismatch
        ? stripeMode === 'live'
          ? 'Your price IDs are from Stripe Test mode. Switch Stripe to Live, create live prices, and use those IDs — or use sk_test_ for testing.'
          : 'Your price IDs are from Stripe Live mode but your secret key is test. Use matching test price IDs or switch to sk_live_.'
        : undefined,
    });
  } catch (error) {
    console.error('--- STRIPE PLANS ERROR ---', error);

    return stripeConfigResponse(createUnavailablePlans(), {
      error: 'Unable to load live pricing from Stripe.',
    });
  }
}
