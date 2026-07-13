import { NextResponse } from 'next/server';
import { getGoogleApiKey, getGoogleChatModelIds } from '@/lib/google-ai';
import { getSupabaseEnvStatus } from '@/lib/supabase/env';
import { tryCreateServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseEnv = getSupabaseEnvStatus();

  return NextResponse.json({
    googleKey: Boolean(getGoogleApiKey()),
    chatModels: getGoogleChatModelIds(),
    database: Boolean(process.env.DATABASE_URL),
    supabase: supabaseEnv.ready,
    supabaseEnv,
  });
}
