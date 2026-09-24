alter table public.listing_media
  add column if not exists overlay_text text;
