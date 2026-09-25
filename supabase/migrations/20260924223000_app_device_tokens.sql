create table if not exists public.app_device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android', 'web')),
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists app_device_tokens_user_id_idx
  on public.app_device_tokens(user_id);

alter table public.app_device_tokens enable row level security;

drop policy if exists "Users can read their own device tokens" on public.app_device_tokens;
create policy "Users can read their own device tokens"
  on public.app_device_tokens for select
  using (auth.uid() = user_id);

drop policy if exists "Users can register their own device tokens" on public.app_device_tokens;
create policy "Users can register their own device tokens"
  on public.app_device_tokens for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own device tokens" on public.app_device_tokens;
create policy "Users can update their own device tokens"
  on public.app_device_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own device tokens" on public.app_device_tokens;
create policy "Users can remove their own device tokens"
  on public.app_device_tokens for delete
  using (auth.uid() = user_id);

comment on table public.app_device_tokens is
  'APNs, Android, and web push destinations. Exact user location is never stored here.';
