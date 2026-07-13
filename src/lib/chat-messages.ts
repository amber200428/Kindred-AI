import 'server-only';

import type { UIMessage } from 'ai';
import { UI } from '@/lib/labels';
import { generateId } from '@/lib/generate-id';
import { tryCreateServerSupabaseClient } from '@/lib/supabase/server';

type MessageRow = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};


export function dbMessagesToUIMessages(rows: MessageRow[]): UIMessage[] {
  return rows.flatMap((row) => {
    if (row.role !== 'user' && row.role !== 'assistant') {
      return [];
    }

    return [
      {
        id: row.id,
        role: row.role,
        parts: [{ type: 'text' as const, text: row.content }],
      },
    ];
  });
}

export async function getMessagesForChat(
  chatId: string,
  clerkUserId: string,
): Promise<UIMessage[]> {
  const supabase = tryCreateServerSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select('id')
    .eq('id', chatId)
    .eq('user_id', clerkUserId)
    .maybeSingle();

  if (chatError || !chat) {
    if (chatError) {
      console.error('Error verifying chat for messages:', chatError);
    }
    return [];
  }

  const { data, error } = await supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return dbMessagesToUIMessages((data ?? []) as MessageRow[]);
}

export async function ensureChatForUser(params: {
  chatId: string;
  userId: string;
  title?: string;
}): Promise<boolean> {
  const supabase = tryCreateServerSupabaseClient();
  if (!supabase) {
    return false;
  }

  const { data: existing, error: lookupError } = await supabase
    .from('chats')
    .select('id')
    .eq('id', params.chatId)
    .eq('user_id', params.userId)
    .maybeSingle();

  if (lookupError) {
    console.error('Error looking up chat:', lookupError);
    return false;
  }

  if (existing) {
    return true;
  }

  const { error } = await supabase.from('chats').insert([
    {
      id: params.chatId,
      user_id: params.userId,
      title: params.title?.trim() || UI.NEW_ENTRY,
      content: '',
    },
  ]);

  if (error) {
    console.error('Error creating chat:', error);
    return false;
  }

  return true;
}

export async function saveChatMessage(params: {
  id?: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
}): Promise<string | null> {
  const supabase = tryCreateServerSupabaseClient();
  if (!supabase) {
    return null;
  }

  const trimmed = params.content.trim();
  if (!trimmed) {
    return null;
  }

  const messageId = params.id ?? generateId();

  const { error } = await supabase.from('messages').upsert(
    {
      id: messageId,
      chat_id: params.chatId,
      role: params.role,
      content: trimmed,
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.error('Error saving message:', error);
    return null;
  }

  return messageId;
}

export async function syncChatPreview(
  chatId: string,
  clerkUserId: string,
): Promise<void> {
  const supabase = tryCreateServerSupabaseClient();
  if (!supabase) {
    return;
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error || !messages?.length) {
    if (error) {
      console.error('Error loading messages for preview:', error);
    }
    return;
  }

  const firstUserMessage = messages.find((message) => message.role === 'user');
  const title =
    firstUserMessage?.content.split('\n')[0].slice(0, 80) || UI.NEW_ENTRY;
  const content = messages
    .map((message) => message.content)
    .join('\n\n')
    .slice(0, 4000);

  const { error: updateError } = await supabase
    .from('chats')
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq('id', chatId)
    .eq('user_id', clerkUserId);

  if (updateError) {
    console.error('Error syncing chat preview:', updateError);
  }
}

export function getLatestPersistableUserMessage(messages: UIMessage[]): {
  id: string;
  text: string;
} | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== 'user') continue;

    const text = message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join(' ');

    if (!text.trim()) continue;

    return {
      id: message.id || generateId(),
      text: text.trim(),
    };
  }

  return null;
}
