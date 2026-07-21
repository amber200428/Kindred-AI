import { NextResponse } from 'next/server';
import { getGoogleApiKey, getGoogleChatModelIds } from '@/lib/google-ai';
import { getSupabaseEnvStatus, getSupabaseUrl } from '@/lib/supabase/env';
import { checkSupabaseChatTables } from '@/lib/supabase/tables';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseEnv = getSupabaseEnvStatus();
  const supabaseTables = supabaseEnv.ready
    ? await checkSupabaseChatTables()
    : { chats: false, messages: false, error: 'Supabase env vars missing.' };

  return NextResponse.json({
    googleKey: Boolean(getGoogleApiKey()),
    chatModels: getGoogleChatModelIds(),
    database: Boolean(process.env.DATABASE_URL),
    supabase: supabaseEnv.ready,
    supabaseEnv,
    supabaseTables,
    supabaseProject: supabaseEnv.urlValid
      ? getSupabaseUrl()?.replace(/^https:\/\//, '')
      : null,
    supabaseMisconfigured:
      supabaseEnv.url && !supabaseEnv.urlValid
        ? 'NEXT_PUBLIC_SUPABASE_URL must be your project URL (https://YOUR-PROJECT.supabase.co), not an API key.'
        : null,
  });
}
