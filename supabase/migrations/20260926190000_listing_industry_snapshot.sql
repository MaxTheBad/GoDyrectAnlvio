alter table public.listings add column if not exists industry text;

update public.listings as listing
set industry = business.industry
from public.businesses as business
where listing.business_id = business.id
  and (listing.industry is null or listing.industry = '');

create index if not exists idx_listings_industry on public.listings (industry);
