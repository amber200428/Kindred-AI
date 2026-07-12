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
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('--- STRIPE PLANS ERROR --- STRIPE_SECRET_KEY is not set');

    return stripeConfigResponse(createUnavailablePlans(), {
      hint: 'Add STRIPE_SECRET_KEY (sk_live_...) — this is not the same as STRIPE_WEBHOOK_SECRET.',
    });
  }

  try {
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

    return NextResponse.json({
      plans,
      configured: getMissingStripeEnvVars().length === 0 && plans.some((p) => p.available),
      missingEnvVars: getMissingStripeEnvVars(),
    });
  } catch (error) {
    console.error('--- STRIPE PLANS ERROR ---', error);

    return stripeConfigResponse(createUnavailablePlans(), {
      error: 'Unable to load live pricing from Stripe.',
    });
  }
}
