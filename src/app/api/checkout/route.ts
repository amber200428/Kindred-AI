export const dynamic = 'force-dynamic';

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  PLAN_IDS,
  getPriceIdForPlan,
  isValidPlan,
  type PlanId,
} from '@/lib/plans';
import { getAppUrl, getStripe } from '@/lib/stripe';
import { getOrCreateUser } from '@/lib/user';

function resolveCheckoutPrice(body: { priceId?: string; plan?: string }) {
  const allowedPriceIds = new Map<string, PlanId>(
    PLAN_IDS.flatMap((plan) => {
      const priceId = getPriceIdForPlan(plan);
      return priceId ? [[priceId, plan] as const] : [];
    }),
  );

  if (body.priceId && allowedPriceIds.has(body.priceId)) {
    return {
      priceId: body.priceId,
      plan: allowedPriceIds.get(body.priceId)!,
    };
  }

  const plan: PlanId = isValidPlan(body.plan ?? '')
    ? (body.plan as PlanId)
    : 'monthly';
  const priceId = getPriceIdForPlan(plan);

  if (!priceId) {
    return null;
  }

  return { priceId, plan };
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            'Please sign in to subscribe. If you are already signed in, verify CLERK_SECRET_KEY is set for Preview on Vercel and add this site URL in Clerk → Domains.',
        },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const resolved = resolveCheckoutPrice(body);

    if (!resolved) {
      return NextResponse.json(
        { error: 'Invalid or unconfigured price. Select a plan and try again.' },
        { status: 400 },
      );
    }

    const { priceId, plan } = resolved;
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress;
    const user = await getOrCreateUser(userId, email);

    const appUrl = getAppUrl();
    const isLifetime = plan === 'lifetime';

    const session = await getStripe().checkout.sessions.create({
      mode: isLifetime ? 'payment' : 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/?upgraded=true&plan=${plan}`,
      cancel_url: `${appUrl}/?upgrade=canceled`,
      client_reference_id: userId,
      metadata: { clerkId: userId, plan },
      ...(isLifetime
        ? {}
        : {
            // Collect a payment method during the trial so billing can start after day 3.
            payment_method_collection: 'always',
            subscription_data: {
              trial_period_days: 3,
              metadata: { clerkId: userId, plan },
            },
          }),
      ...(user.stripeCustomerId
        ? { customer: user.stripeCustomerId }
        : {
            customer_email: clerkUser?.emailAddresses[0]?.emailAddress,
          }),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('--- STRIPE CHECKOUT ERROR ---', error);

    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("Can't reach database server") ||
      message.includes('P1001') ||
      message.includes('PrismaClientInitializationError')
    ) {
      return NextResponse.json(
        {
          error:
            'Database is temporarily unavailable. Wait a few seconds and try again.',
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
