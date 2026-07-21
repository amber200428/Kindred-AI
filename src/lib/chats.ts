import 'server-only';

import { tryCreateServerSupabaseClient } from '@/lib/supabase/server';
import type { ChatHistoryItem } from '@/lib/types/chats';

export type { ChatHistoryItem } from '@/lib/types/chats';

type ChatListRow = {
  id: string;
  title: string;
  content: string | null;
};

export async function getChatsForUser(
  clerkUserId: string,
): Promise<ChatHistoryItem[] | null> {
  const supabase = tryCreateServerSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('chats')
    .select('id, title, content')
    .eq('user_id', clerkUserId)
    .order('updated_at', { ascending: false });

  if (error?.code === '42703') {
    const fallback = await supabase
      .from('chats')
      .select('id, title, content')
      .eq('user_id', clerkUserId)
      .order('created_at', { ascending: false });

    if (fallback.error) {
      console.error('Error fetching chats:', fallback.error);
      return null;
    }

    return (fallback.data as ChatListRow[]).map((chat) => ({
      id: chat.id,
      label: chat.title,
      content: chat.content ?? undefined,
    }));
  }

  if (error) {
    console.error('Error fetching chats:', error);
    return null;
  }

  return (data as ChatListRow[]).map((chat) => ({
    id: chat.id,
    label: chat.title,
    content: chat.content ?? undefined,
  }));
}

export async function getChatForUser(chatId: string, clerkUserId: string) {
  const supabase = tryCreateServerSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('chats')
    .select('id, title, content, user_id')
    .eq('id', chatId)
    .eq('user_id', clerkUserId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching chat:', error);
    return null;
  }

  return data;
}
