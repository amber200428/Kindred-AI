import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature') as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new NextResponse('Webhook Error', { status: 400 });
  }

  // Handle successful payments
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      client_reference_id?: string | null;
      customer?: string | null;
      mode?: string;
      metadata?: { plan?: string };
    };
    const userId = session.client_reference_id;

    if (userId) {
      await db.user.update({
        where: { clerkId: userId },
        data: {
          isSubscribed: true,
          ...(session.customer ? { stripeCustomerId: session.customer } : {}),
        },
      });
    }
  }

  // Handle subscription cancellations
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as { customer?: string | null };
    await db.user.updateMany({
      where: { stripeCustomerId: subscription.customer },
      data: { isSubscribed: false },
    });
  }

  return new NextResponse(null, { status: 200 });
}
