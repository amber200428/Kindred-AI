import { db } from '@/lib/db';
import { getTrialEndDate } from '@/lib/trial';

export const FREE_DAILY_CHAT_LIMIT = 5;

function placeholderEmail(clerkId: string) {
  return `${clerkId}@users.clerk.local`;
}

export function getEffectiveChatCount(user: {
  chatCount: number;
  lastChatDate: Date;
}) {
  const today = new Date().toDateString();

  if (user.lastChatDate.toDateString() !== today) {
    return 0;
  }

  return user.chatCount;
}

export function isTrialActive(user: {
  isSubscribed: boolean;
  createdAt: Date;
}) {
  if (user.isSubscribed) {
    return false;
  }

  const trialEnd = getTrialEndDate(user.createdAt);
  return new Date() <= trialEnd;
}

export async function getOrCreateUser(clerkId: string, email?: string) {
  const resolvedEmail = email ?? placeholderEmail(clerkId);

  return db.user.upsert({
    where: { clerkId },
    create: {
      clerkId,
      email: resolvedEmail,
    },
    update: email ? { email } : {},
  });
}

// Backwards-compatible alias
export const getOrCreateTrialUser = getOrCreateUser;
