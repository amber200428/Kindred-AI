-- Run in Supabase SQL Editor if you see PostgreSQL error 42703 (undefined_column)
-- This aligns an older/partial chats table with what the app expects.

alter table public.chats add column if not exists content text default '';
alter table public.chats add column if not exists created_at timestamptz not null default now();
alter table public.chats add column if not exists updated_at timestamptz not null default now();

alter table public.messages add column if not exists chat_id uuid references public.chats(id) on delete cascade;
alter table public.messages add column if not exists role text;
alter table public.messages add column if not exists content text default '';
alter table public.messages add column if not exists created_at timestamptz not null default now();

-- Keep updated_at fresh when chats are edited
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists chats_set_updated_at on public.chats;
create trigger chats_set_updated_at
before update on public.chats
for each row execute function public.set_updated_at();

-- Chat history is server-side only
alter table public.chats disable row level security;
alter table public.messages disable row level security;
