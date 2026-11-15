// Isolated PostgreSQL regression fixture. Never connects to Supabase.
// Pass a locally installed @electric-sql/pglite module path as argv[2], or install
// it outside this checkout and expose it through your Node module environment.
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const { PGlite } = await import(process.argv[2] || '@electric-sql/pglite')
const db = new PGlite()
const root = new URL('../', import.meta.url)
const catalog = JSON.parse(await readFile(new URL('docs/security/live-catalog-2026-11-15.json', root)))
const sql = name => readFile(new URL(`docs/security/proposals/${name}`, root), 'utf8')
const q = s => `"${s.replaceAll('"', '""')}"`
const lit = s => `'${s.replaceAll("'", "''")}'`
const ids = {
  member: '00000000-0000-0000-0000-000000000001',
  exec: '00000000-0000-0000-0000-000000000002',
  admin: '00000000-0000-0000-0000-000000000003',
}
let passed = 0
async function check(label, fn) { await fn(); passed++; console.log(`PASS ${label}`) }
async function as(role, id, statement) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', ${lit(id || '')}, false); select set_config('request.jwt.claim.role', ${lit(role)}, false); set role ${q(role)}`)
  return db.query(statement)
}
async function denied(fn) {
  await assert.rejects(fn, e => e.code === '42501')
}
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role', true)$$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on all functions in schema auth to anon, authenticated;
    create table public.profiles(id uuid primary key, role text, full_name text);
    insert into public.profiles values (${lit(ids.member)}, 'member', 'Member'), (${lit(ids.exec)}, 'exec', 'Exec'), (${lit(ids.admin)}, 'admin', 'Admin');`)
  const tables = catalog.relations.filter(x => x.schema === 'public' && x.kind === 'r')
  for (const t of tables) {
    if (t.name !== 'profiles') await db.exec(`create table public.${q(t.name)} (id uuid, created_by uuid, exec_only boolean default false, type text)`)
    await db.exec(`alter table public.${q(t.name)} enable row level security; grant select, insert, update, delete on public.${q(t.name)} to anon, authenticated`)
  }
  await db.exec(catalog.functions.find(f => f.schema === 'public' && f.name === 'is_exec').definition)
  // Channel membership is outside these tests; no fixture user is a member.
  await db.exec(`create function public.is_channel_member(uuid, uuid) returns boolean language sql stable as $$select false$$`)
  for (const p of catalog.policies.filter(p => p.schemaname === 'public' && ['profiles', 'tasks', 'channels'].includes(p.tablename))) {
    await db.exec(`create policy ${q(p.policyname)} on public.${q(p.tablename)} as ${p.permissive} for ${p.cmd} to ${p.roles.map(q).join(', ')}${p.qual ? ` using (${p.qual})` : ''}${p.with_check ? ` with check (${p.with_check})` : ''}`)
  }
  await db.exec(`insert into public.tasks (exec_only) values (false), (true)`)
  await check('fixture reproduces anonymous task read', async () => assert.equal((await as('anon', null, 'select * from tasks')).rows.length, 1))
  await check('fixture reproduces anonymous DM insert', () => as('anon', null, "insert into channels(type) values ('dm')"))
  await db.exec('reset role')
  await db.exec(await sql('001-security.up.sql'))
  await check('anonymous task read blocked', async () => assert.equal((await as('anon', null, 'select * from tasks')).rows.length, 0))
  await check('anonymous DM insert blocked', () => denied(() => as('anon', null, "insert into channels(type) values ('dm')")))
  await check('authenticated identity without uid blocked', () => denied(() => as('authenticated', null, "insert into channels(type) values ('dm')")))
  await check('member can edit own display name', async () => assert.equal((await as('authenticated', ids.member, `update profiles set full_name='Updated' where id=${lit(ids.member)} returning full_name`)).rows[0].full_name, 'Updated'))
  await check('member self-promotion blocked', () => denied(() => as('authenticated', ids.member, `update profiles set role='exec' where id=${lit(ids.member)}`)))
  await check('exec role changes blocked', () => denied(() => as('authenticated', ids.exec, `update profiles set role='admin' where id=${lit(ids.member)}`)))
  await check('authenticated member sees only non-exec tasks', async () => assert.equal((await as('authenticated', ids.member, 'select * from tasks')).rows.length, 1))
  await check('authenticated exec sees all tasks', async () => assert.equal((await as('authenticated', ids.exec, 'select * from tasks')).rows.length, 2))
  await check('admin role changes allowed', () => as('authenticated', ids.admin, `update profiles set role='exec' where id=${lit(ids.member)}`))
  await check('admin identity reassignment blocked', () => denied(() => as('authenticated', ids.admin, `update profiles set id='00000000-0000-0000-0000-000000000099' where id=${lit(ids.member)}`)))
  await db.exec('reset role')
  await check('all 18 internal tables guarded; videos excluded', async () => {
    const rows = (await db.query("select tablename from pg_policies where policyname='tnn_internal_requires_identity'")).rows
    assert.equal(rows.length, 18); assert(!rows.some(r => r.tablename === 'videos'))
  })
  await db.exec(await sql('001-security.down.sql'))
  await check('rollback restores anonymous task behavior', async () => assert.equal((await as('anon', null, 'select * from tasks')).rows.length, 1))
  await check('rollback restores previous profile update behavior', () => as('authenticated', ids.member, `update profiles set role='member' where id=${lit(ids.member)}`))
  await db.exec('reset role')
  await check('rollback removes every added policy and guard', async () => {
    assert.equal((await db.query("select * from pg_policies where policyname='tnn_internal_requires_identity'")).rows.length, 0)
    assert.equal((await db.query("select oid from pg_proc where proname='tnn_guard_profile_identity_role'")).rows.length, 0)
  })
  console.log(`${passed} isolated PostgreSQL checks passed. Full Supabase integration remains untested.`)
} finally { await db.close() }
