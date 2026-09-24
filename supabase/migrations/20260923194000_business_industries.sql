alter table public.businesses add column if not exists industry text;
create index if not exists idx_businesses_industry on public.businesses (industry);
