export const dynamic = 'force-dynamic';

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  PLAN_IDS,
  getPriceIdForPlan,
  isValidPlan,
  type PlanId,
} from '@/lib/plans';
import { getAppUrl, getStripe } from '@/lib/stripe';
import { UI } from '@/lib/labels';
import { getOrCreateUser } from '@/lib/user';

type CheckoutUser = {
  id: string;
  stripeCustomerId: string | null;
  email: string;
};

function isStripeLikeError(
  error: unknown,
): error is { message?: string; code?: string; type?: string } {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { type?: unknown; raw?: unknown };
  return (
    typeof candidate.type === 'string' &&
    candidate.type.startsWith('Stripe')
  );
}

function resolveCheckoutEmail(
  user: CheckoutUser,
  clerkEmail?: string | null,
): string | undefined {
  if (clerkEmail) {
    return clerkEmail;
  }

  if (user.email.endsWith('@users.clerk.local')) {
    return undefined;
  }

  return user.email;
}

async function clearStripeCustomerId(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: { stripeCustomerId: null },
  });
}

async function resolveCheckoutCustomer(
  user: CheckoutUser,
  clerkEmail?: string | null,
): Promise<{ customer: string } | { customer_email: string }> {
  if (user.stripeCustomerId) {
    try {
      const customer = await getStripe().customers.retrieve(
        user.stripeCustomerId,
      );

      if (!('deleted' in customer && customer.deleted)) {
        return { customer: user.stripeCustomerId };
      }

      await clearStripeCustomerId(user.id);
    } catch (error) {
      // Test/live mismatch, deleted customers, or wrong-account IDs should
      // never block checkout — clear and fall back to email.
      console.warn(
        '--- STRIPE CHECKOUT --- clearing invalid stripeCustomerId',
        user.stripeCustomerId,
        isStripeLikeError(error)
          ? { code: error.code, type: error.type, message: error.message }
          : error,
      );
      await clearStripeCustomerId(user.id);
    }
  }

  const email = resolveCheckoutEmail(user, clerkEmail);
  if (!email) {
    throw new Error(
      'Add an email address to your account before subscribing.',
    );
  }

  return { customer_email: email };
}

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
        { error: UI.AUTH_REQUIRED_FOR_CHECKOUT },
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

    const customerParams = await resolveCheckoutCustomer(user, email);

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
      ...customerParams,
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

    if (message.includes('Unique constraint failed')) {
      return NextResponse.json(
        {
          error:
            'Your account email is already linked to another profile. Sign out, sign back in, and try again.',
        },
        { status: 409 },
      );
    }

    if (message.includes('email address to your account')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (isStripeLikeError(error)) {
      console.error('Stripe code:', error.code, 'type:', error.type);
      return NextResponse.json(
        {
          error:
            error.message ||
            'Payment provider error. Please try again in a moment.',
        },
        { status: 502 },
      );
    }

    // Surface the real failure so the UI is actionable instead of opaque.
    return NextResponse.json(
      {
        error: message
          ? `Checkout failed: ${message}`
          : 'Checkout failed. Please try again in a moment.',
      },
      { status: 500 },
    );
  }
}
