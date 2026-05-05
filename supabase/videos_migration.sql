-- ============================================================
-- TNN Videos Table Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create the videos table
create table if not exists public.videos (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  href            text not null,
  section         text not null default 'catalog',
  placement       text not null default 'section-item',
  placements      jsonb not null default '[]'::jsonb,
  hero_variant    text default 'mosaic',
  thumbnail       text,
  dek             text,
  byline          text,
  runtime         text,
  date            text,
  display_order   integer not null default 0,
  published       boolean not null default true,
  segment_id      uuid references public.segments(id) on delete set null,
  segment_title   text,
  upload_status   text not null default 'published',
  creator_id      uuid references public.profiles(id) on delete set null,
  credits         jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Existing installs: add publishing-link fields without rebuilding the table.
alter table public.videos add column if not exists segment_id uuid references public.segments(id) on delete set null;
alter table public.videos add column if not exists segment_title text;
alter table public.videos add column if not exists upload_status text not null default 'published';
alter table public.videos add column if not exists creator_id uuid references public.profiles(id) on delete set null;
alter table public.videos add column if not exists credits jsonb not null default '[]'::jsonb;
alter table public.videos add column if not exists placements jsonb not null default '[]'::jsonb;

-- 2. Auto-update updated_at on every change
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists videos_updated_at on public.videos;

create trigger videos_updated_at
  before update on public.videos
  for each row execute procedure update_updated_at_column();

-- 3. Enable Row Level Security
alter table public.videos enable row level security;

-- 4. RLS Policies
--    Public: anyone can read published videos (for the public site)
drop policy if exists "Public can read published videos" on public.videos;
create policy "Public can read published videos"
  on public.videos
  for select
  using (published = true);

--    Authenticated: logged-in users can read ALL videos (including drafts, for the CMS)
drop policy if exists "Authenticated users can read all videos" on public.videos;
create policy "Authenticated users can read all videos"
  on public.videos
  for select
  to authenticated
  using (true);

--    Exec/Admin: can insert, update, delete
drop policy if exists "Exec and admin can insert videos" on public.videos;
create policy "Exec and admin can insert videos"
  on public.videos
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('exec', 'admin')
    )
  );

drop policy if exists "Exec and admin can update videos" on public.videos;
create policy "Exec and admin can update videos"
  on public.videos
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('exec', 'admin')
    )
  );

drop policy if exists "Exec and admin can delete videos" on public.videos;
create policy "Exec and admin can delete videos"
  on public.videos
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('exec', 'admin')
    )
  );

-- 5. Useful indexes
create index if not exists videos_published_idx on public.videos (published);
create index if not exists videos_section_idx   on public.videos (section);
create index if not exists videos_placement_idx on public.videos (placement);
create index if not exists videos_placements_idx on public.videos using gin (placements);
create index if not exists videos_order_idx     on public.videos (display_order, created_at desc);
create index if not exists videos_segment_idx   on public.videos (segment_id);
create index if not exists videos_upload_status_idx on public.videos (upload_status);
create index if not exists videos_creator_idx   on public.videos (creator_id);
create index if not exists videos_credits_idx   on public.videos using gin (credits);

-- 5b. Public-safe creator directory used by public bylines/profile pages.
-- This intentionally exposes only id, full_name, and role, not emails or auth metadata.
create or replace view public.public_profiles as
  select id, full_name, role
  from public.profiles
  where full_name is not null;

grant select on public.public_profiles to anon;
grant select on public.public_profiles to authenticated;

-- 6. Grant anon read access (for public site without auth)
grant select on public.videos to anon;
grant all    on public.videos to authenticated;

-- ============================================================
-- Also patch the existing profiles RLS if needed so the app
-- can read profiles when checking exec/admin status.
-- Only run these if you don't already have these policies.
-- ============================================================

-- alter table public.profiles enable row level security;

-- create policy "Users can read all profiles"
--   on public.profiles
--   for select
--   to authenticated
--   using (true);

-- create policy "Users can update own profile"
--   on public.profiles
--   for update
--   to authenticated
--   using (auth.uid() = id);

-- create policy "Exec and admin can update any profile"
--   on public.profiles
--   for update
--   to authenticated
--   using (
--     exists (
--       select 1 from public.profiles
--       where id = auth.uid()
--         and role in ('exec', 'admin')
--     )
--   );
