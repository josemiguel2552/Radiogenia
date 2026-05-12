-- Invitations table
create table if not exists invitations (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  owner_id uuid references auth.users(id) on delete cascade,
  max_uses int not null default 3,
  used_count int not null default 0,
  created_at timestamptz default now(),

  constraint invitations_uses_check check (used_count <= max_uses)
);

create index if not exists idx_invitations_code on invitations(code);
create index if not exists idx_invitations_owner on invitations(owner_id);

-- Track who was invited by whom
alter table profiles add column if not exists invited_by uuid references auth.users(id);
alter table profiles add column if not exists invitation_code text;
alter table profiles add column if not exists referral_bonus_expires_at timestamptz;
alter table profiles add column if not exists country text;
alter table profiles add column if not exists hospital text;
alter table profiles add column if not exists professional_role text;

-- Invitation redemptions log
create table if not exists invitation_redemptions (
  id uuid default gen_random_uuid() primary key,
  invitation_id uuid references invitations(id) on delete cascade not null,
  redeemed_by uuid references auth.users(id) on delete cascade not null,
  redeemed_at timestamptz default now(),

  constraint unique_redemption unique (invitation_id, redeemed_by)
);
