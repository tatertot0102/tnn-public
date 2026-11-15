import test from 'node:test'
import assert from 'node:assert/strict'
import { createInviteHandler } from '../supabase/functions/invite-staff/handler.mjs'
const payload = { email: 'new-staff@example.com', full_name: 'New Staff' }
function fixture(overrides = {}) {
  const calls = []
  const handler = createInviteHandler({ verifyToken: async () => ({ id: 'verified-user' }), getRole: async () => 'exec', invite: async (...args) => { calls.push(args); return {} }, redirectTo: 'https://platform.bthstnn.org/', ...overrides })
  const request = (body = payload, headers = {}, method = 'POST') => handler(new Request('https://example.test/invite-staff', { method, headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json', ...headers }, ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) }))
  return { calls, request }
}
for (const role of ['exec', 'admin']) test(`${role} can invite only as a new default member`, async () => {
  const f = fixture({ getRole: async id => { assert.equal(id, 'verified-user'); return role } })
  assert.equal((await f.request()).status, 200)
  assert.deepEqual(f.calls, [[payload.email, { data: { full_name: payload.full_name }, redirectTo: 'https://platform.bthstnn.org/' }]])
})
for (const role of ['member', 'exec-roles', null]) test(`${role} cannot invite`, async () => {
  const f = fixture({ getRole: async () => role }); assert.equal((await f.request()).status, 403); assert.equal(f.calls.length, 0)
})
test('missing bearer and invalid session denied', async () => {
  const f = fixture(); assert.equal((await f.request(payload, { authorization: '' })).status, 401)
  const invalid = fixture({ verifyToken: async () => null }); assert.equal((await invalid.request()).status, 401); assert.equal(invalid.calls.length, 0)
})
for (const bad of [{ ...payload, role: 'admin' }, { ...payload, redirectTo: 'https://evil.test' }, [], { email: 'bad', full_name: 'X' }, { ...payload, full_name: '' }]) test(`invalid or privileged payload rejected: ${JSON.stringify(bad)}`, async () => {
  const f = fixture(); assert.equal((await f.request(bad)).status, 400); assert.equal(f.calls.length, 0)
})
test('untrusted browser origin denied; known origin allowed', async () => {
  const f = fixture(); assert.equal((await f.request(payload, { origin: 'https://evil.test' })).status, 403)
  const response = await f.request(payload, { origin: 'https://bthstnn.org' }); assert.equal(response.headers.get('access-control-allow-origin'), 'https://bthstnn.org')
})
test('lookup failure denies request without sending invitation', async () => {
  const f = fixture({ getRole: async () => { throw new Error('database unavailable') } }); assert.equal((await f.request()).status, 503); assert.equal(f.calls.length, 0)
})
test('provider failure is sanitized', async () => {
  const f = fixture({ invite: async () => ({ error: 'secret provider details' }) }); const r = await f.request(); assert.equal(r.status, 502); assert(!((await r.text()).includes('secret')))
})
test('server redirect must use an allowed HTTPS origin', async () => {
  const f = fixture({ redirectTo: 'https://evil.test/' }); assert.equal((await f.request()).status, 503); assert.equal(f.calls.length, 0)
})
test('oversize request and malformed JSON rejected', async () => {
  const f = fixture(); assert.equal((await f.request('x'.repeat(8193))).status, 413); assert.equal((await f.request('{')).status, 400); assert.equal(f.calls.length, 0)
})
test('non-JSON body and wrong method rejected', async () => {
  const f = fixture(); assert.equal((await f.request(payload, { 'content-type': 'text/plain' })).status, 415); assert.equal((await f.request(null, {}, 'GET')).status, 405)
})
test('preflight performs no privileged work', async () => {
  const f = fixture({ verifyToken: async () => { throw new Error('should not run') } }); assert.equal((await f.request(null, { origin: 'https://platform.bthstnn.org' }, 'OPTIONS')).status, 204); assert.equal(f.calls.length, 0)
})
