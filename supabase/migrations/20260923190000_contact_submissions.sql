create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 320),
  role text check (role in ('owner', 'buyer', 'broker') or role is null),
  message text not null check (char_length(message) between 1 and 5000),
  created_at timestamptz not null default now()
);

alter table public.contact_submissions enable row level security;

drop policy if exists "anyone can submit contact requests" on public.contact_submissions;
create policy "anyone can submit contact requests"
on public.contact_submissions
for insert
to anon, authenticated
with check (true);

revoke all on table public.contact_submissions from anon, authenticated;
grant insert on table public.contact_submissions to anon, authenticated;
