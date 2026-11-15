-- DRAFT: REVIEW ONLY. Not applied. Requires complete baseline review and owner approval.
-- No data updates; transactionally reversible with 001-security.down.sql.
begin;
create function public.tnn_guard_profile_identity_role()
returns trigger language plpgsql security definer set search_path = pg_catalog
as $guard$
begin
  if new.id is distinct from old.id then
    raise exception 'Profile identity cannot be changed' using errcode = '42501';
  end if;
  if new.role is distinct from old.role and not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Only an administrator can change profile roles' using errcode = '42501';
  end if;
  return new;
end;
$guard$;
revoke all on function public.tnn_guard_profile_identity_role() from public, anon, authenticated;
create trigger tnn_guard_profile_identity_role
before update on public.profiles
for each row execute function public.tnn_guard_profile_identity_role();

-- A restrictive policy ANDs with existing permissive policies; it cannot grant access.
-- Blocks missing-auth mistakes on every internal public table in the live snapshot.
-- Public videos and public_profiles are intentionally excluded. Service-role/owner RLS
-- bypass and SECURITY DEFINER sharing RPCs are not changed by this policy.
do $policies$
declare target text;
begin
  foreach target in array array['approval_feedback', 'approval_gate_approvers', 'approval_gates', 'channel_group_members', 'channel_groups', 'channel_members', 'channels', 'media_share_links', 'messages', 'milestones', 'notifications', 'profiles', 'segment_deliverables', 'segment_media', 'segment_roles', 'segments', 'subtasks', 'tasks'] loop
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=target and c.relrowsecurity) then
      raise exception 'Expected RLS-enabled table public.% is missing or changed', target;
    end if;
    execute format('create policy tnn_internal_requires_identity on public.%I as restrictive for all to public using (auth.uid() is not null) with check (auth.uid() is not null)', target);
  end loop;
end;
$policies$;
commit;
