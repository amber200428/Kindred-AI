import 'server-only';

import { ChatCategory, MessageRole } from '@prisma/client';
import { db } from '@/lib/db';
import type {
  FinancialChatSummary,
  StoredMessage,
} from '@/lib/types/financial-chat';
import { getOrCreateUser } from '@/lib/user';

export type { FinancialChatSummary, StoredMessage } from '@/lib/types/financial-chat';

function toStoredMessage(message: {
  id: string;
  chatId: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}): StoredMessage {
  return {
    id: message.id,
    chatId: message.chatId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function getFinancialChatForUser(chatId: string, clerkId: string) {
  const user = await getOrCreateUser(clerkId);

  return db.chat.findFirst({
    where: {
      id: chatId,
      userId: user.id,
      category: ChatCategory.financial,
    },
  });
}

export async function createFinancialChat(clerkId: string, title = 'Financial Co-Pilot') {
  const user = await getOrCreateUser(clerkId);

  return db.chat.create({
    data: {
      userId: user.id,
      title,
      category: ChatCategory.financial,
    },
  });
}

export async function getFinancialChatsForUser(
  clerkId: string,
): Promise<FinancialChatSummary[]> {
  const user = await getOrCreateUser(clerkId);

  const chats = await db.chat.findMany({
    where: {
      userId: user.id,
      category: ChatCategory.financial,
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      createdAt: true,
    },
  });

  return chats.map((chat) => ({
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt.toISOString(),
  }));
}

export async function getMessagesForChat(
  chatId: string,
  clerkId: string,
): Promise<StoredMessage[]> {
  const chat = await getFinancialChatForUser(chatId, clerkId);

  if (!chat) {
    throw new Error('CHAT_NOT_FOUND');
  }

  const messages = await db.message.findMany({
    where: { chatId },
    orderBy: { createdAt: 'asc' },
  });

  return messages.map(toStoredMessage);
}

export async function saveMessage(
  chatId: string,
  role: MessageRole,
  content: string,
) {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('Message content is required.');
  }

  const message = await db.message.create({
    data: {
      chatId,
      role,
      content: trimmed,
    },
  });

  await db.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });

  return toStoredMessage(message);
}

export function deriveChatTitle(content: string) {
  const firstLine = content.split('\n')[0]?.trim() ?? 'Financial Co-Pilot';
  return firstLine.slice(0, 80) || 'Financial Co-Pilot';
}

export async function ensureChatTitleFromFirstMessage(
  chatId: string,
  content: string,
) {
  const chat = await db.chat.findUnique({
    where: { id: chatId },
    select: { title: true },
  });

  if (!chat || chat.title !== 'Financial Co-Pilot') {
    return;
  }

  await db.chat.update({
    where: { id: chatId },
    data: { title: deriveChatTitle(content) },
  });
}

export function toModelMessages(messages: StoredMessage[]) {
  return messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.content,
    }));
}
