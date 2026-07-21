import 'server-only';

import { tryCreateServerSupabaseClient } from '@/lib/supabase/server';

export async function checkSupabaseChatTables(): Promise<{
  chats: boolean;
  messages: boolean;
  error?: string;
}> {
  const supabase = tryCreateServerSupabaseClient();
  if (!supabase) {
    return { chats: false, messages: false, error: 'Supabase is not configured.' };
  }

  const [chatsResult, messagesResult] = await Promise.all([
    supabase.from('chats').select('id').limit(1),
    supabase.from('messages').select('id').limit(1),
  ]);

  const chats = !chatsResult.error;
  const messages = !messagesResult.error;
  const error =
    chatsResult.error?.message || messagesResult.error?.message || undefined;

  return { chats, messages, error };
}
