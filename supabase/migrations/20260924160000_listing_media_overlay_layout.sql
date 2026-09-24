alter table public.listing_media
  add column if not exists overlay_x smallint not null default 50,
  add column if not exists overlay_y smallint not null default 50,
  add column if not exists overlay_size smallint not null default 23;
