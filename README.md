# TNN Platform

Full-stack React site for Tech News Network — public video site + internal newsroom tool, powered by Supabase.

## Structure

```
/                    → Public homepage (hero video, today's mix, info row)
/videos              → Full video catalog with filters
/videos/:section     → Filtered by section (hardnews, features, etc.)
/login               → Newsroom login
/newsroom            → Dashboard (exec or member view)
/newsroom/segments   → Segment list
/newsroom/segments/:id → Segment detail (subtasks, milestones, roles, notes)
/newsroom/tasks      → Kanban task board
/newsroom/videos     → Video CMS (add/edit/publish videos)
/newsroom/team       → Team members + invite
```

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Supabase
```bash
cp .env.example .env
# Fill in your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### 3. Supabase tables

**Already in your project** (confirmed from your Table Editor):
- `profiles` — id, full_name, email, role, avatar_url
- `segments` — your existing segments table
- `segment_roles` — linking segments to users
- `milestones` — milestone groupings for subtasks
- `subtasks` — individual checklist items
- `tasks` — standalone tasks

**Needs to be added** — run the migration:
```
supabase/videos_migration.sql
```
Paste the contents into your Supabase SQL Editor and run it. This creates the `videos` table with proper RLS policies so:
- Anonymous visitors can read published videos (public site)
- Authenticated users can read all videos including drafts (CMS)
- Only `exec` and `admin` roles can insert/update/delete

### Roles
Your `profiles.role` column supports: `admin`, `exec`, `member`, `alumni`
- `admin` and `exec` both get full newsroom access (create/edit/delete everything)
- `member` gets read access + their own segments/tasks
- `alumni` gets read-only

### 6. Run
```bash
npm run dev
```

## Connecting to your existing Astro admin

This React app reads from the same Supabase `videos` table your Astro admin writes to. No migration needed — just point both to the same project.

The public site (`/` and `/videos`) reads published videos in real-time from Supabase.
The newsroom CMS (`/newsroom/videos`) lets execs add/edit/publish videos — same as your existing Astro dashboard but integrated into the unified site.
