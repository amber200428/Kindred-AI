import 'server-only';

import { tryCreateServerSupabaseClient } from '@/lib/supabase/server';
import type { ChatHistoryItem } from '@/lib/types/chats';

export type { ChatHistoryItem } from '@/lib/types/chats';

type ChatListRow = {
  id: string;
  title: string;
};

export async function getChatsForUser(
  clerkUserId: string,
): Promise<ChatHistoryItem[]> {
  const supabase = tryCreateServerSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('chats')
    .select('id, title')
    .eq('user_id', clerkUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching chats:', error);
    return [];
  }

  return (data as ChatListRow[]).map((chat) => ({
    id: chat.id,
    label: chat.title,
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
