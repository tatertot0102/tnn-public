-- Run manually in the Supabase SQL editor; keep results private, outside Git.
-- READ ONLY. No password hashes, access tokens, or story bodies are selected.
begin read only;
select id, email, created_at, last_sign_in_at, email_confirmed_at, banned_until
from auth.users order by created_at desc;
select id, full_name, email, role, created_at
from public.profiles where role in ('exec', 'admin') order by created_at desc;
-- Current row timestamps are NOT edit history or proof of who made an edit.
select id, title, created_at, updated_at
from public.videos order by updated_at desc nulls last limit 100;
-- SHSAT uses a title search so the query does not assume a story ID or headline.
select id, title, created_at, updated_at
from public.videos where title ilike '%SHSAT%' order by updated_at desc nulls last;
commit;
