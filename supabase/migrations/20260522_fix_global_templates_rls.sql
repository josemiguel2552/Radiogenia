-- Fix: restrict global_templates INSERT/UPDATE/DELETE to admin only.
-- Previously any authenticated user could modify global templates.

drop policy if exists "Authenticated can insert global templates" on public.global_templates;
drop policy if exists "Authenticated can update global templates" on public.global_templates;
drop policy if exists "Authenticated can delete global templates" on public.global_templates;

create policy "Only admin can insert global templates"
  on public.global_templates for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Only admin can update global templates"
  on public.global_templates for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Only admin can delete global templates"
  on public.global_templates for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
