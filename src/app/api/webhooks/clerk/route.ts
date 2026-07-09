import { verifyWebhook } from '@clerk/nextjs/webhooks';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';

function getEmailFromClerkUser(data: {
  email_addresses?: { email_address: string }[];
}) {
  return data.email_addresses?.[0]?.email_address;
}

export async function POST(req: NextRequest) {
  try {
    const event = await verifyWebhook(req);

    switch (event.type) {
      case 'user.created': {
        const email = getEmailFromClerkUser(event.data);

        if (!email) {
          break;
        }

        await db.user.upsert({
          where: { clerkId: event.data.id },
          create: {
            clerkId: event.data.id,
            email,
          },
          update: { email },
        });
        break;
      }
      case 'user.deleted': {
        await db.user.deleteMany({
          where: { clerkId: event.data.id },
        });
        break;
      }
    }

    return new Response('Webhook received', { status: 200 });
  } catch (error) {
    console.error('--- CLERK WEBHOOK ERROR ---', error);
    return new Response('Webhook verification failed', { status: 400 });
  }
}
