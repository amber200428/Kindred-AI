export const dynamic = 'force-dynamic';

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new NextResponse('Webhook secret not configured', { status: 500 });
  }

  const body = await req.text();
  const signature = (await headers()).get('stripe-signature') as string;

  let event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new NextResponse('Webhook Error', { status: 400 });
  }

  console.log('--- WEBHOOK RECEIVED ---');
  console.log('Event Type:', event.type);
  if (event.type === 'checkout.session.completed') {
    console.log('Session Metadata:', event.data.object.metadata);
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
