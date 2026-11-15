# Public-table audit from the live catalog

All 19 public base tables have RLS enabled. A view is not a base table. Policy definitions below are live evidence, not proof that every workflow is correctly authorized.

## approval_feedback

```sql
-- Authenticated users can leave approval feedback | INSERT | roles: public
USING: None
WITH CHECK: (auth.uid() = author_id)
-- Approval feedback viewable by authenticated users | SELECT | roles: public
USING: (auth.role() = 'authenticated'::text)
WITH CHECK: None
-- Authors or execs can delete approval feedback | DELETE | roles: public
USING: ((author_id = auth.uid()) OR is_exec(auth.uid()))
WITH CHECK: None
```

## approval_gate_approvers

```sql
-- Gate approvers viewable by authenticated users | SELECT | roles: public
USING: (auth.role() = 'authenticated'::text)
WITH CHECK: None
-- Members can add gate approvers | INSERT | roles: public
USING: None
WITH CHECK: (auth.role() = 'authenticated'::text)
-- Members can remove gate approvers | DELETE | roles: public
USING: (auth.role() = 'authenticated'::text)
WITH CHECK: None
-- Approvers record their own decision | UPDATE | roles: public
USING: (user_id = auth.uid())
WITH CHECK: (user_id = auth.uid())
```

## approval_gates

```sql
-- Approval gates viewable by authenticated users | SELECT | roles: public
USING: (auth.role() = 'authenticated'::text)
WITH CHECK: None
-- Team members can create approval gates | INSERT | roles: public
USING: None
WITH CHECK: (auth.role() = 'authenticated'::text)
-- Authenticated users can update approval gates | UPDATE | roles: public
USING: (auth.role() = 'authenticated'::text)
WITH CHECK: None
-- Execs can delete approval gates | DELETE | roles: public
USING: is_exec(auth.uid())
WITH CHECK: None
```

## channel_group_members

```sql
-- Channel group members viewable by authenticated users | SELECT | roles: public
USING: (auth.role() = 'authenticated'::text)
WITH CHECK: None
-- Execs manage channel group members | ALL | roles: public
USING: is_exec(auth.uid())
WITH CHECK: None
```

## channel_groups

```sql
-- Channel groups viewable by authenticated users | SELECT | roles: public
USING: (auth.role() = 'authenticated'::text)
WITH CHECK: None
-- Execs manage channel groups | ALL | roles: public
USING: is_exec(auth.uid())
WITH CHECK: None
```

## channel_members

```sql
-- Channel members viewable by members or execs | SELECT | roles: public
USING: (is_exec(auth.uid()) OR is_channel_member(channel_id, auth.uid()))
WITH CHECK: None
-- Execs or self can remove membership | DELETE | roles: public
USING: (is_exec(auth.uid()) OR (user_id = auth.uid()))
WITH CHECK: None
-- Members can add people to channels they're in | INSERT | roles: public
USING: None
WITH CHECK: (is_exec(auth.uid()) OR is_channel_member(channel_id, auth.uid()))
```

## channels

```sql
-- Execs can update channels | UPDATE | roles: public
USING: is_exec(auth.uid())
WITH CHECK: None
-- Execs can delete channels | DELETE | roles: public
USING: is_exec(auth.uid())
WITH CHECK: None
-- Execs create channels, anyone can start a DM | INSERT | roles: public
USING: None
WITH CHECK: ((type = 'dm'::text) OR is_exec(auth.uid()))
-- Channels viewable by members or execs | SELECT | roles: public
USING: (is_exec(auth.uid()) OR is_channel_member(id, auth.uid()) OR (created_by = auth.uid()))
WITH CHECK: None
```

## media_share_links

```sql
-- Share links viewable by authenticated users | SELECT | roles: public
USING: (auth.role() = 'authenticated'::text)
WITH CHECK: None
-- Anyone signed in can create share links | INSERT | roles: public
USING: None
WITH CHECK: ((auth.role() = 'authenticated'::text) AND (created_by = auth.uid()))
-- Creators and execs can revoke share links | UPDATE | roles: public
USING: ((created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['exec'::text, 'admin'::text]))))))
WITH CHECK: None
```

## messages

```sql
-- Messages viewable by channel members or execs | SELECT | roles: public
USING: (is_exec(auth.uid()) OR is_channel_member(channel_id, auth.uid()))
WITH CHECK: None
-- Senders or execs can delete messages | DELETE | roles: public
USING: ((sender_id = auth.uid()) OR is_exec(auth.uid()))
WITH CHECK: None
-- Members can post unless channel is read-only for them | INSERT | roles: public
USING: None
WITH CHECK: ((sender_id = auth.uid()) AND (is_exec(auth.uid()) OR (is_channel_member(channel_id, auth.uid()) AND (NOT (EXISTS ( SELECT 1
   FROM channels c
  WHERE ((c.id = messages.channel_id) AND (c.read_only OR (c.type = 'announcement'::text)))))))))
```

## milestones

```sql
-- Milestones viewable by authenticated users | SELECT | roles: public
USING: (auth.role() = 'authenticated'::text)
WITH CHECK: None
-- Authenticated users can manage milestones | ALL | roles: public
USING: (auth.role() = 'authenticated'::text)
WITH CHECK: None
```

## notifications

```sql
-- Users see their own notifications | SELECT | roles: public
USING: (user_id = auth.uid())
WITH CHECK: None
-- Users can update their own notifications | UPDATE | roles: public
USING: (user_id = auth.uid())
WITH CHECK: None
-- Users can delete their own notifications | DELETE | roles: public
USING: (user_id = auth.uid())
WITH CHECK: None
```

## profiles

```sql
-- Profiles are viewable by all authenticated users | SELECT | roles: public
USING: (auth.role() = 'authenticated'::text)
WITH CHECK: None
-- Users can update their own profile | UPDATE | roles: public
USING: (auth.uid() = id)
WITH CHECK: None
-- Execs can update any profile | UPDATE | roles: public
USING: (EXISTS ( SELECT 1
   FROM profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.role = ANY (ARRAY['exec'::text, 'admin'::text])))))
WITH CHECK: None
-- Users can update own profile | UPDATE | roles: authenticated
USING: (auth.uid() = id)
WITH CHECK: None
-- Users can read all profiles | SELECT | roles: authenticated
USING: true
WITH CHECK: None
-- Exec can update any profile | UPDATE | roles: authenticated
USING: (EXISTS ( SELECT 1
   FROM profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.role = 'exec'::text))))
WITH CHECK: None
```

## segment_deliverables

```sql
-- Anyone signed in can update deliverables | UPDATE | roles: public
USING: (auth.role() = 'authenticated'::text)
WITH CHECK: None
-- Deliverables viewable by authenticated users | SELECT | roles: public
USING: (auth.role() = 'authenticated'::text)
WITH CHECK: None
-- Anyone signed in can add deliverables | INSERT | roles: public
USING: None
WITH CHECK: (auth.role() = 'authenticated'::text)
-- Creators and execs can unmark deliverables | DELETE | roles: public
USING: ((created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['exec'::text, 'admin'::text]))))))
WITH CHECK: None
```

## segment_media

```sql
-- Segment media viewable by authenticated users | SELECT | roles: public
USING: (auth.role() = 'authenticated'::text)
WITH CHECK: None
-- Authenticated users can link a folder to a segment | INSERT | roles: public
USING: None
WITH CHECK: (auth.role() = 'authenticated'::text)
-- Execs can change a segment's folder | UPDATE | roles: public
USING: (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['exec'::text, 'admin'::text])))))
WITH CHECK: None
-- Execs can unlink a segment's folder | DELETE | roles: public
USING: (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['exec'::text, 'admin'::text])))))
WITH CHECK: None
```

## segment_roles

```sql
-- Segment roles viewable by authenticated users | SELECT | roles: public
USING: (auth.role() = 'authenticated'::text)
WITH CHECK: None
-- Execs can manage segment roles | ALL | roles: public
USING: (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['exec'::text, 'admin'::text])))))
WITH CHECK: None
```

## segments

```sql
-- Segments viewable by all authenticated users | SELECT | roles: public
USING: (auth.role() = 'authenticated'::text)
WITH CHECK: None
-- Execs can create segments | INSERT | roles: public
USING: None
WITH CHECK: (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['exec'::text, 'admin'::text])))))
-- Execs can update segments | UPDATE | roles: public
USING: (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['exec'::text, 'admin'::text])))))
WITH CHECK: None
-- Execs can delete segments | DELETE | roles: public
USING: (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['exec'::text, 'admin'::text])))))
WITH CHECK: None
```

## subtasks

```sql
-- Subtasks viewable by authenticated users | SELECT | roles: public
USING: (auth.role() = 'authenticated'::text)
WITH CHECK: None
-- Team members can create subtasks | INSERT | roles: public
USING: None
WITH CHECK: (auth.role() = 'authenticated'::text)
-- Authenticated users can update subtasks | UPDATE | roles: public
USING: (auth.role() = 'authenticated'::text)
WITH CHECK: None
-- Execs can delete subtasks | DELETE | roles: public
USING: (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['exec'::text, 'admin'::text])))))
WITH CHECK: None
```

## tasks

```sql
-- Authenticated users can create tasks | INSERT | roles: public
USING: None
WITH CHECK: (auth.role() = 'authenticated'::text)
-- Execs or task creator can update tasks | UPDATE | roles: public
USING: ((auth.uid() = created_by) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['exec'::text, 'admin'::text]))))))
WITH CHECK: None
-- Execs can delete tasks | DELETE | roles: public
USING: (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['exec'::text, 'admin'::text])))))
WITH CHECK: None
-- Tasks viewable respecting exec_only | SELECT | roles: public
USING: ((NOT exec_only) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['exec'::text, 'admin'::text]))))))
WITH CHECK: None
```

## videos

```sql
-- Public can read published videos | SELECT | roles: public
USING: ((published = true) AND (publish_status = ANY (ARRAY['published'::text, 'scheduled'::text])) AND ((scheduled_at IS NULL) OR (scheduled_at <= now())))
WITH CHECK: None
-- Authenticated users can read all videos | SELECT | roles: authenticated
USING: true
WITH CHECK: None
-- Exec can insert videos | INSERT | roles: authenticated
USING: None
WITH CHECK: (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'exec'::text))))
-- Exec can update videos | UPDATE | roles: authenticated
USING: (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'exec'::text))))
WITH CHECK: None
-- Exec can delete videos | DELETE | roles: authenticated
USING: (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'exec'::text))))
WITH CHECK: None
```

## Findings and proposal scope

- Confirmed: self-profile policies allow role changes and no profile trigger protects role. Draft 001 restricts role changes to a caller whose current profile is admin; it also prevents identity reassignment. It has no service-role exception. Trusted maintenance scripts that change roles will need explicit design review.
- Confirmed: tasks SELECT permits anonymous reads of non-exec tasks. Draft 001 adds an identity requirement.
- Confirmed: channels INSERT accepts `type = dm` without authentication. Draft 001 adds an identity requirement across all 18 internal tables to cover this same class of omission.
- Other broad authenticated grants remain: any authenticated user can update subtasks, manage milestones, update approval gates, add/remove gate approvers, and update deliverables. These are authorization/integrity concerns requiring workflow decisions; authentication alone does not resolve them. {{TODO: define who may modify each workflow and protect approval decision/assignment columns}}.
- Authenticated profiles SELECT exposes full rows to staff. Anonymous public_profiles is a separate view. {{TODO: review public view fields and grants against the complete baseline; public data minimization is Phase G4}}.
- `resolve_media_share` is SECURITY DEFINER and checks a supplied token, revocation, and expiry. Its intentional sharing boundary remains outside the restrictive policy. {{TODO: audit execute grants, token entropy and RPC behavior on an isolated database}}.
- Video writes use the exact role `exec`; `admin` is not included in those live predicates. Do not assume admin/exec parity. {{TODO: confirm intended video publishing permissions}}.
- Invite-only onboarding is not complete. The live signup trigger inserts a profile using its default role and does not copy a role from user metadata. {{TODO: confirm signup is disabled; implement exec-checked server-side invites in the CMS editors actually use, with the service key confined to the server and new users forced to member}}.
- {{TODO: confirm an existing legitimate admin can manage roles before applying the guard; no account roles will be changed automatically}}.
- {{TODO: finish managed schemas, grants, SECURITY DEFINER functions, and storage authorization review from a complete schema-only dump}}. This is not a claim that Phase A3 is complete.

The up/down files are proposals outside the migration runner. Do not apply to production without approval. Rolling back restores the original vulnerabilities; it is an emergency compatibility option, not a recommended steady state.
