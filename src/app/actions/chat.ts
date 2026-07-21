'use server';

import { auth } from '@clerk/nextjs/server';
import { ensureChatForUser } from '@/lib/chat-messages';
import { tryCreateServerSupabaseClient } from '@/lib/supabase/server';
import { UI } from '@/lib/labels';

export type SaveReflectionResult =
  | { success: false; error: string }
  | { success: true; id: string };

export async function saveReflection(
  title: string,
  content: string,
  chatId?: string,
): Promise<SaveReflectionResult> {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: UI.AUTH_REQUIRED_TO_START };
  }

  const trimmedContent = content.trim();
  const trimmedTitle = title.trim() || UI.NEW_ENTRY;

  if (!trimmedContent) {
    return { success: false, error: 'Content is required' };
  }

  let supabase = tryCreateServerSupabaseClient();
  if (!supabase) {
    console.error('Supabase is not configured for chat history.');
    return { success: false, error: UI.HISTORY_SAVE_UNAVAILABLE };
  }

  if (chatId) {
    const { data: existing, error: lookupError } = await supabase
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .eq('user_id', userId)
      .maybeSingle();

    if (lookupError) {
      console.error('Database Error:', lookupError);
      return { success: false, error: lookupError.message };
    }

    if (existing) {
      const { error } = await supabase
        .from('chats')
        .update({ title: trimmedTitle, content: trimmedContent })
        .eq('id', chatId)
        .eq('user_id', userId);

      if (error) {
        console.error('Database Error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, id: chatId };
    }

    const { data, error } = await supabase
      .from('chats')
      .insert([
        {
          id: chatId,
          user_id: userId,
          title: trimmedTitle,
          content: trimmedContent,
        },
      ])
      .select();

    if (error) {
      console.error('Database Error:', error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'No data returned from database.' };
    }

    const savedChat = data[0] as { id: string };
    return { success: true, id: savedChat.id };
  }

  const { data, error } = await supabase
    .from('chats')
    .insert([
      {
        user_id: userId,
        title: trimmedTitle,
        content: trimmedContent,
      },
    ])
    .select();

  if (error) {
    console.error('Database Error:', error);
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return { success: false, error: 'No data returned from database.' };
  }

  const savedChat = data[0] as { id: string };

  return { success: true, id: savedChat.id };
}

export async function createChatDraft(chatId: string): Promise<SaveReflectionResult> {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: UI.AUTH_REQUIRED_TO_START };
  }

  const saved = await ensureChatForUser({
    chatId,
    userId,
    title: UI.NEW_ENTRY,
  });

  if (!saved.ok) {
    return { success: false, error: saved.error || UI.HISTORY_SAVE_UNAVAILABLE };
  }

  return { success: true, id: chatId };
}

export async function createNewChat(): Promise<SaveReflectionResult> {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: UI.AUTH_REQUIRED_TO_START };
  }

  const supabase = tryCreateServerSupabaseClient();
  if (!supabase) {
    return { success: false, error: UI.HISTORY_SAVE_UNAVAILABLE };
  }

  const { data, error } = await supabase
    .from('chats')
    .insert([{ user_id: userId, title: UI.NEW_ENTRY, content: '' }])
    .select();

  if (error) {
    console.error('Database Error:', error);
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return { success: false, error: 'No data returned from database.' };
  }

  const savedChat = data[0] as { id: string };

  return { success: true, id: savedChat.id };
}
