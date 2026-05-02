-- Hospital multi-tenant: organizations, sections, members, shared resources, support tickets
-- Individual subscriber model is untouched — all changes are additive.

-- ══════════════════════════════════════════════════════════════
-- 1. Organizations
-- ══════════════════════════════════════════════════════════════
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  billing_email text,
  stripe_customer_id text,
  stripe_subscription_id text,
  max_seats integer not null default 50,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

create policy "admin full access on organizations"
  on public.organizations for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "org members read own org"
  on public.organizations for select
  using (exists (select 1 from public.org_members where org_id = organizations.id and user_id = auth.uid() and is_active = true));

-- ══════════════════════════════════════════════════════════════
-- 2. Sections within an organization
-- ══════════════════════════════════════════════════════════════
create table if not exists public.org_sections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (org_id, slug)
);

alter table public.org_sections enable row level security;

create policy "admin full access on org_sections"
  on public.org_sections for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "org members view sections"
  on public.org_sections for select
  using (exists (select 1 from public.org_members where org_id = org_sections.org_id and user_id = auth.uid() and is_active = true));

create policy "org_chief manages sections"
  on public.org_sections for all
  using (exists (
    select 1 from public.org_members
    where org_id = org_sections.org_id and user_id = auth.uid() and is_org_chief = true and is_active = true
  ));

-- ══════════════════════════════════════════════════════════════
-- 3. Organization members
-- ══════════════════════════════════════════════════════════════
create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  section_id uuid references public.org_sections(id) on delete set null,
  is_org_chief boolean not null default false,
  section_role text not null default 'radiologist'
    check (section_role in ('section_chief', 'section_editor', 'radiologist')),
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  deactivated_at timestamptz,
  unique (org_id, user_id)
);

create index if not exists org_members_user_idx on public.org_members (user_id, is_active);
create index if not exists org_members_org_section_idx on public.org_members (org_id, section_id, is_active);

alter table public.org_members enable row level security;

create policy "admin full access on org_members"
  on public.org_members for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "org members view members"
  on public.org_members for select
  using (org_id in (select om.org_id from public.org_members om where om.user_id = auth.uid() and om.is_active = true));

create policy "org_chief manages all members"
  on public.org_members for all
  using (exists (
    select 1 from public.org_members om
    where om.org_id = org_members.org_id and om.user_id = auth.uid() and om.is_org_chief = true and om.is_active = true
  ));

create policy "section_chief manages section members"
  on public.org_members for insert
  with check (
    exists (
      select 1 from public.org_members om
      where om.org_id = org_members.org_id
        and om.user_id = auth.uid()
        and om.section_role = 'section_chief'
        and om.section_id = org_members.section_id
        and om.is_active = true
    )
    and org_members.section_role in ('radiologist', 'section_editor')
    and org_members.is_org_chief = false
  );

create policy "section_chief updates section members"
  on public.org_members for update
  using (
    exists (
      select 1 from public.org_members om
      where om.org_id = org_members.org_id
        and om.user_id = auth.uid()
        and om.section_role = 'section_chief'
        and om.section_id = org_members.section_id
        and om.is_active = true
    )
  );

-- ══════════════════════════════════════════════════════════════
-- 4. Shared templates (per section)
-- ══════════════════════════════════════════════════════════════
create table if not exists public.org_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  section_id uuid not null references public.org_sections(id) on delete cascade,
  name text not null,
  modality text not null,
  base_template_id integer,
  structure jsonb not null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.org_templates enable row level security;

create policy "org members read all org templates"
  on public.org_templates for select
  using (exists (
    select 1 from public.org_members where org_id = org_templates.org_id and user_id = auth.uid() and is_active = true
  ));

create policy "section editors manage templates"
  on public.org_templates for insert
  with check (public.can_edit_org_section(auth.uid(), org_templates.section_id));

create policy "section editors update templates"
  on public.org_templates for update
  using (public.can_edit_org_section(auth.uid(), org_templates.section_id));

create policy "section editors delete templates"
  on public.org_templates for delete
  using (public.can_edit_org_section(auth.uid(), org_templates.section_id));

create policy "admin full access on org_templates"
  on public.org_templates for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ══════════════════════════════════════════════════════════════
-- 5. Shared normality phrases (per section)
-- ══════════════════════════════════════════════════════════════
create table if not exists public.org_normality_phrases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  section_id uuid not null references public.org_sections(id) on delete cascade,
  modality text not null,
  section_label text not null,
  phrase text not null,
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (section_id, modality, section_label)
);

alter table public.org_normality_phrases enable row level security;

create policy "org members read org normality phrases"
  on public.org_normality_phrases for select
  using (exists (
    select 1 from public.org_members where org_id = org_normality_phrases.org_id and user_id = auth.uid() and is_active = true
  ));

create policy "section editors manage normality phrases"
  on public.org_normality_phrases for insert
  with check (public.can_edit_org_section(auth.uid(), org_normality_phrases.section_id));

create policy "section editors update normality phrases"
  on public.org_normality_phrases for update
  using (public.can_edit_org_section(auth.uid(), org_normality_phrases.section_id));

create policy "section editors delete normality phrases"
  on public.org_normality_phrases for delete
  using (public.can_edit_org_section(auth.uid(), org_normality_phrases.section_id));

create policy "admin full access on org_normality_phrases"
  on public.org_normality_phrases for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ══════════════════════════════════════════════════════════════
-- 6. Shared recommendations (per section)
-- ══════════════════════════════════════════════════════════════
create table if not exists public.org_recommendations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  section_id uuid not null references public.org_sections(id) on delete cascade,
  trigger_keyword text not null,
  recommendation_text text not null,
  source text default 'manual' check (source in ('manual', 'pdf_extracted')),
  guideline_name text default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.org_recommendations enable row level security;

create policy "org members read org recommendations"
  on public.org_recommendations for select
  using (exists (
    select 1 from public.org_members where org_id = org_recommendations.org_id and user_id = auth.uid() and is_active = true
  ));

create policy "section editors manage recommendations"
  on public.org_recommendations for insert
  with check (public.can_edit_org_section(auth.uid(), org_recommendations.section_id));

create policy "section editors update recommendations"
  on public.org_recommendations for update
  using (public.can_edit_org_section(auth.uid(), org_recommendations.section_id));

create policy "section editors delete recommendations"
  on public.org_recommendations for delete
  using (public.can_edit_org_section(auth.uid(), org_recommendations.section_id));

create policy "admin full access on org_recommendations"
  on public.org_recommendations for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ══════════════════════════════════════════════════════════════
-- 7. Support tickets
-- ══════════════════════════════════════════════════════════════
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null default '',
  body text not null,
  category text not null default 'general'
    check (category in ('error', 'question', 'complaint', 'general')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'closed')),
  admin_reply text,
  admin_user_id uuid references auth.users(id),
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_org_idx on public.support_tickets (org_id, status);
create index if not exists support_tickets_user_idx on public.support_tickets (user_id);

alter table public.support_tickets enable row level security;

create policy "users manage own tickets"
  on public.support_tickets for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "admin full access on support_tickets"
  on public.support_tickets for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "org_chief reads org tickets"
  on public.support_tickets for select
  using (
    org_id is not null
    and exists (
      select 1 from public.org_members
      where org_id = support_tickets.org_id and user_id = auth.uid() and is_org_chief = true and is_active = true
    )
  );

-- ══════════════════════════════════════════════════════════════
-- 8. Helper functions for RLS
-- ══════════════════════════════════════════════════════════════

-- Check if a user can edit resources in a given section
create or replace function public.can_edit_org_section(uid uuid, sid uuid)
returns boolean as $$
  select exists (
    select 1 from public.org_members
    where user_id = uid and is_active = true
    and (
      is_org_chief = true
      or (section_id = sid and section_role in ('section_chief', 'section_editor'))
    )
  );
$$ language sql security definer stable;

-- Get a user's org membership (returns null if not in any org)
create or replace function public.get_user_org(uid uuid)
returns table (org_id uuid, section_id uuid, is_org_chief boolean, section_role text) as $$
  select org_id, section_id, is_org_chief, section_role
  from public.org_members
  where user_id = uid and is_active = true
  limit 1;
$$ language sql security definer stable;

-- ══════════════════════════════════════════════════════════════
-- 9. Denormalized org_id on profiles for fast billing bypass
-- ══════════════════════════════════════════════════════════════
alter table public.profiles
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

-- Trigger to keep profiles.org_id in sync with org_members
create or replace function public.sync_profile_org_id()
returns trigger as $$
begin
  if TG_OP = 'DELETE' then
    update public.profiles set org_id = null
    where id = old.user_id
      and not exists (select 1 from public.org_members where user_id = old.user_id and is_active = true and id != old.id);
    return old;
  end if;

  if TG_OP = 'INSERT' and new.is_active = true then
    update public.profiles set org_id = new.org_id where id = new.user_id;
    return new;
  end if;

  if TG_OP = 'UPDATE' then
    if new.is_active = true then
      update public.profiles set org_id = new.org_id where id = new.user_id;
    else
      update public.profiles set org_id = null
      where id = new.user_id
        and not exists (select 1 from public.org_members where user_id = new.user_id and is_active = true and id != new.id);
    end if;
    return new;
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_profile_org_id on public.org_members;
create trigger trg_sync_profile_org_id
  after insert or update or delete on public.org_members
  for each row execute function public.sync_profile_org_id();

-- ══════════════════════════════════════════════════════════════
-- 10. Additive RLS on reports for supervisor read access
-- ══════════════════════════════════════════════════════════════
create policy "section_chief reads section reports"
  on public.reports for select
  using (
    exists (
      select 1 from public.org_members chief
      join public.org_members member
        on member.org_id = chief.org_id
        and member.section_id = chief.section_id
        and member.user_id = reports.user_id
        and member.is_active = true
      where chief.user_id = auth.uid()
        and chief.section_role = 'section_chief'
        and chief.is_active = true
    )
  );

create policy "org_chief reads all org reports"
  on public.reports for select
  using (
    exists (
      select 1 from public.org_members chief
      join public.org_members member
        on member.org_id = chief.org_id
        and member.user_id = reports.user_id
        and member.is_active = true
      where chief.user_id = auth.uid()
        and chief.is_org_chief = true
        and chief.is_active = true
    )
  );

-- ══════════════════════════════════════════════════════════════
-- 11. Update 000_full_setup reference
-- ══════════════════════════════════════════════════════════════
-- No changes to 000_full_setup.sql needed. This migration is purely additive.
-- All existing tables, RLS policies, triggers, and functions remain untouched.
