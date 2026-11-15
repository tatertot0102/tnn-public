import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { createInviteHandler } from './handler.mjs'

// Server runtime only. No service credential is included in a browser bundle.
const url = Deno.env.get('SUPABASE_URL')
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const redirectTo = Deno.env.get('TNN_INVITE_REDIRECT_URL')
if (!url || !serviceKey || !redirectTo) throw new Error('Missing invitation service configuration')
const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
Deno.serve(createInviteHandler({
  redirectTo,
  verifyToken: async (token: string) => {
    const { data, error } = await service.auth.getUser(token)
    if (error) return null
    return data.user
  },
  getRole: async (id: string) => {
    const { data, error } = await service.from('profiles').select('role').eq('id', id).single()
    if (error) throw error
    return data.role
  },
  invite: (email: string, options: { data: { full_name: string }, redirectTo: string }) => service.auth.admin.inviteUserByEmail(email, options),
}))
