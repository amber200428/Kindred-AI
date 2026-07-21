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
  const clerkPublishableKey = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
  const clerkSecretKey = Boolean(process.env.CLERK_SECRET_KEY);
  const clerkSignInUrl = Boolean(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL);

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
    clerk: {
      publishableKey: clerkPublishableKey,
      secretKey: clerkSecretKey,
      signInUrl: clerkSignInUrl,
      ready: clerkPublishableKey && clerkSecretKey,
    },
    clerkMisconfigured:
      !clerkPublishableKey || !clerkSecretKey
        ? 'Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in Vercel for Production, then redeploy.'
        : !clerkSignInUrl
          ? 'Set NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in in Vercel to avoid proxy auth errors.'
          : null,
  });
}
