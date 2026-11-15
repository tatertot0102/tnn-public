// Dependency-injected so authorization tests never contact Supabase or send mail.
export function createInviteHandler({ verifyToken, getRole, invite, redirectTo }) {
  const origins = new Set(['https://bthstnn.org', 'https://platform.bthstnn.org'])
  return async request => {
    const origin = request.headers.get('origin')
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin' }
    if (origin && origins.has(origin)) headers['Access-Control-Allow-Origin'] = origin
    const reply = (status, error) => new Response(JSON.stringify(error ? { error } : { ok: true }), { status, headers })
    if (origin && !origins.has(origin)) return reply(403, 'Origin not allowed')
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info' } })
    if (request.method !== 'POST') return reply(405, 'POST required')
    const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization') || '')
    if (!match) return reply(401, 'Authentication required')
    try {
      const user = await verifyToken(match[1])
      if (!user?.id) return reply(401, 'Invalid session')
      if (!['exec', 'admin'].includes(await getRole(user.id))) return reply(403, 'Executive access required')
      // Configuration is server-owned. A request cannot supply a redirect or role.
      const redirect = new URL(redirectTo)
      if (redirect.protocol !== 'https:' || !origins.has(redirect.origin) || redirect.username || redirect.password) return reply(503, 'Invitation service is not configured')
      if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) return reply(415, 'JSON required')
      const reader = request.body?.getReader()
      if (!reader) return reply(400, 'Request body required')
      const chunks = []; let length = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        length += value.byteLength
        if (length > 8192) { await reader.cancel(); return reply(413, 'Request too large') }
        chunks.push(value)
      }
      const bytes = new Uint8Array(length); let offset = 0
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
      let body
      try { body = JSON.parse(new TextDecoder().decode(bytes)) } catch { return reply(400, 'Invalid JSON') }
      if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).some(k => !['email', 'full_name'].includes(k))) return reply(400, 'Only email and full_name are accepted')
      if (typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) return reply(400, 'Valid email required')
      if (typeof body.full_name !== 'string' || !body.full_name.trim() || body.full_name.trim().length > 100) return reply(400, 'Full name required (100 characters maximum)')
      // Live handle_new_user inserts role using its member default, not metadata.
      const result = await invite(body.email.trim(), { data: { full_name: body.full_name.trim() }, redirectTo: redirect.href })
      if (result?.error) return reply(502, 'Invitation failed')
      return reply(200)
    } catch { return reply(503, 'Invitation service unavailable') }
  }
}
