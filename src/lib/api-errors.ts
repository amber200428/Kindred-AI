export function formatUserFacingApiError(params: {
  error?: string;
  details?: string;
  fallback: string;
}): string {
  const base = params.error ?? params.fallback;
  const details = params.details?.trim();

  if (!details || details === base) {
    return base;
  }

  return `${base} (${details})`;
}
