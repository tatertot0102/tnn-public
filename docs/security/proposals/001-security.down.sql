-- DRAFT rollback. Restores the previous access model, including its known gaps.
-- Does not undo legitimate role changes made while the guard was installed.
begin;
do $policies$
declare target text;
begin
  foreach target in array array['approval_feedback', 'approval_gate_approvers', 'approval_gates', 'channel_group_members', 'channel_groups', 'channel_members', 'channels', 'media_share_links', 'messages', 'milestones', 'notifications', 'profiles', 'segment_deliverables', 'segment_media', 'segment_roles', 'segments', 'subtasks', 'tasks'] loop
    execute format('drop policy tnn_internal_requires_identity on public.%I', target);
  end loop;
end;
$policies$;
drop trigger tnn_guard_profile_identity_role on public.profiles;
drop function public.tnn_guard_profile_identity_role();
commit;
