#!/usr/bin/env bash
# Push Supabase env vars from .env.local to Vercel (Production + Preview).
# Requires: npm i -g vercel && vercel login && vercel link (in repo root)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env.local"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}"
  exit 1
fi

# shellcheck source=/dev/null
source "${ROOT}/scripts/env-file.sh"

VARS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
)

missing=()
for key in "${VARS[@]}"; do
  value="$(read_env "${key}")"
  if [[ -z "${value}" ]]; then
    missing+=("${key}")
  fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Missing in .env.local: ${missing[*]}"
  echo "Add them under Supabase Dashboard → Settings → API, then re-run."
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "Install Vercel CLI: npm i -g vercel"
  echo "Then: vercel login && cd ${ROOT} && vercel link"
  exit 1
fi

cd "${ROOT}"

upsert_vercel_env() {
  local key="$1"
  local value="$2"
  local target="$3"

  printf '%s' "${value}" | vercel env add "${key}" "${target}" --force --yes 2>/dev/null \
    || printf '%s' "${value}" | vercel env add "${key}" "${target}" --force
}

for target in production preview; do
  echo "Syncing Supabase env to Vercel (${target})..."
  for key in "${VARS[@]}"; do
    value="$(read_env "${key}")"
    upsert_vercel_env "${key}" "${value}" "${target}"
    echo "  ✓ ${key}"
  done
done

echo ""
echo "Done. Redeploy production so server picks up new vars:"
echo "  vercel --prod"
echo ""
echo "Verify: https://kindred-ai-pro.vercel.app/api/chat/health"
echo '  supabase: true, supabaseEnv.serviceRoleKey: true'
