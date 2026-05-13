-- Marketing assets library
create table if not exists marketing_assets (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('post', 'image')),
  platform text,
  title text,
  content text,
  image_url text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_marketing_assets_type on marketing_assets(type);
create index if not exists idx_marketing_assets_created on marketing_assets(created_at desc);
