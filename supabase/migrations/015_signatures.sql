-- Signatures table (per-user, multiple allowed, one active at a time)
create table if not exists public.signatures (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  label text not null,
  body text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists signatures_user_idx on public.signatures (user_id);

alter table public.signatures enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'signatures' and policyname = 'users manage own signatures'
  ) then
    create policy "users manage own signatures"
      on public.signatures for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
