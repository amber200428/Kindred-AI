import 'server-only';

import { createClient } from '@supabase/supabase-js';

export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceRoleKey ?? anonKey;

  if (!supabaseUrl || !key) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function tryCreateServerSupabaseClient() {
  try {
    return createServerSupabaseClient();
  } catch {
    return null;
  }
}

export { createServerSupabaseClient as createClient };
