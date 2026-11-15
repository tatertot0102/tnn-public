-- One SELECT accepted by Supabase CLI --read-only. Keep results private, outside Git.
select jsonb_build_object(
 'accounts', (select jsonb_agg(x order by x.created_at desc) from (select id,email,created_at,last_sign_in_at,email_confirmed_at,banned_until from auth.users) x),
 'privileged_profiles', (select jsonb_agg(x order by x.created_at desc) from (select id,full_name,email,role,created_at from public.profiles where role in ('exec','admin')) x),
 'recent_story_edits', (select jsonb_agg(x order by x.updated_at desc nulls last) from (select id,title,created_at,updated_at from public.videos order by updated_at desc nulls last limit 100) x),
 'shsat_edits', (select jsonb_agg(x) from (select id,title,created_at,updated_at from public.videos where title ilike '%SHSAT%') x)
) as checks;
