import 'server-only';

import { createClient } from '@supabase/supabase-js';
import {
  getSupabaseEnvStatus,
  getSupabaseServerKey,
  getSupabaseUrl,
} from '@/lib/supabase/env';

export function createServerSupabaseClient() {
  const supabaseUrl = getSupabaseUrl();
  const key = getSupabaseServerKey();

  if (!supabaseUrl || !key) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function tryCreateServerSupabaseClient() {
  if (!getSupabaseEnvStatus().ready) {
    return null;
  }

  try {
    return createServerSupabaseClient();
  } catch {
    return null;
  }
}

export { createServerSupabaseClient as createClient };
