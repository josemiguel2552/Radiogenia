-- Add compact_normals option to user_model_config
alter table public.user_model_config
  add column if not exists compact_normals boolean default false;
