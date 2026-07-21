import { NextResponse } from 'next/server';
import { getGoogleApiKey, getGoogleChatModelIds } from '@/lib/google-ai';
import { getSupabaseEnvStatus, getSupabaseServiceRoleKeyFormat, getSupabaseUrl } from '@/lib/supabase/env';
import { checkSupabaseChatTables } from '@/lib/supabase/tables';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseEnv = getSupabaseEnvStatus();
  const supabaseTables = supabaseEnv.ready
    ? await checkSupabaseChatTables()
    : { chats: false, messages: false, error: 'Supabase env vars missing.' };

  const serviceRoleKeyFormat = getSupabaseServiceRoleKeyFormat();

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
        : serviceRoleKeyFormat === 'publishable'
          ? 'SUPABASE_SERVICE_ROLE_KEY looks like a publishable/anon key. Use the service_role JWT from Supabase Dashboard → Settings → API.'
          : !supabaseEnv.serviceRoleKey
            ? 'SUPABASE_SERVICE_ROLE_KEY is missing. Chat history writes require the service role key on the server.'
            : null,
  });
}
