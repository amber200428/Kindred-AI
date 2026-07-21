export type SupabaseEnvStatus = {
  url: boolean;
  urlValid: boolean;
  serviceRoleKey: boolean;
  anonKey: boolean;
  /** Server can read/write chat history when URL + at least one key are set. */
  ready: boolean;
};

function trim(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next || undefined;
}

export function isValidSupabaseUrl(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url.includes('://') ? url : `https://${url}`);
    return parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

export function getSupabaseUrl(): string | undefined {
  return trim(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
  );
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return trim(
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SERVICE_KEY,
  );
}

export function getSupabaseAnonKey(): string | undefined {
  return trim(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY,
  );
}

export function getSupabaseServerKey(): string | undefined {
  return getSupabaseServiceRoleKey() ?? getSupabaseAnonKey();
}

export function getSupabaseEnvStatus(): SupabaseEnvStatus {
  const supabaseUrl = getSupabaseUrl();
  const url = Boolean(supabaseUrl);
  const urlValid = isValidSupabaseUrl(supabaseUrl);
  const serviceRoleKey = Boolean(getSupabaseServiceRoleKey());
  const anonKey = Boolean(getSupabaseAnonKey());

  return {
    url,
    urlValid,
    serviceRoleKey,
    anonKey,
    ready: urlValid && (serviceRoleKey || anonKey),
  };
}
