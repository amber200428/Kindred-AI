-- Run in Supabase SQL Editor after 001_chats.sql and 002_messages.sql
-- Chat history is only accessed server-side with the service role key.

alter table public.chats disable row level security;
alter table public.messages disable row level security;
