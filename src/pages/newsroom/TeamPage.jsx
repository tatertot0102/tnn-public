import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import AdminLayout from '../../components/admin/AdminLayout'
import { Spinner, Modal, Field } from '../../components/ui'
import { Plus, Mail } from 'lucide-react'

const ROLES = ['admin', 'exec', 'member', 'alumni']

export default function TeamPage() {
  const { isExec } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setMembers(data || [])
    setLoading(false)
  }

  async function updateRole(id, role) {
    await supabase.from('profiles').update({ role }).eq('id', id)
    setMembers(m => m.map(x => x.id === id ? { ...x, role } : x))
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    setSaving(true)
    const { error } = await supabase.auth.admin.inviteUserByEmail(inviteEmail.trim())
    setSaving(false)
    if (error) setMsg(`Error: ${error.message}`)
    else { setMsg('Invite sent!'); setInviteEmail(''); setInviteName('') }
  }

  const admins  = members.filter(m => m.role === 'admin')
  const execs   = members.filter(m => m.role === 'exec')
  const regular = members.filter(m => m.role === 'member')
  const alumni  = members.filter(m => m.role === 'alumni')

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--adm-text)' }}>Team</h1>
          <p style={{ color: 'var(--adm-muted)', fontSize: 13, marginTop: 3 }}>{members.length} members</p>
        </div>
        {isExec && (
          <button onClick={() => setInviteOpen(true)} className="adm-btn primary"><Mail size={15} /> Invite Member</button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={6} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {[
            { label: 'Admins',    list: admins,  color: '#f87171' },
            { label: 'Executives', list: execs,  color: 'var(--adm-accent)' },
            { label: 'Members',   list: regular, color: '#2dd4bf' },
            { label: 'Alumni',    list: alumni,  color: '#64748b' },
          ].map(({ label, list, color }) => list.length > 0 && (
            <div key={label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0, textTransform: 'uppercase', color: 'var(--adm-muted)' }}>{label}</span>
                <span style={{ fontSize: 11, background: 'var(--adm-surface2)', color: 'var(--adm-muted)', padding: '1px 7px', borderRadius: 10 }}>{list.length}</span>
                <div style={{ flex: 1, height: 1, background: 'var(--adm-border)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {list.map(m => (
                  <div key={m.id} className="adm-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: color + '22', color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 15, flexShrink: 0,
                    }}>
                      {m.full_name?.[0] || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.full_name}
                      </p>
                      {isExec ? (
                        <select
                          value={m.role || 'member'}
                          onChange={e => updateRole(m.id, e.target.value)}
                          style={{ fontSize: 11, background: 'transparent', border: 'none', color: 'var(--adm-muted)', padding: 0, cursor: 'pointer', outline: 'none' }}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : (
                        <p style={{ fontSize: 11, color: 'var(--adm-muted)' }}>{m.role || 'member'}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={inviteOpen} onClose={() => { setInviteOpen(false); setMsg('') }} title="Invite Member" size="sm">
        <Field label="Email *">
          <input className="adm-input" autoFocus type="email" value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)} placeholder="name@school.edu" />
        </Field>
        <Field label="Role">
          <select className="adm-input" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        {msg && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13,
            background: msg.startsWith('Error') ? '#7f1d1d22' : '#14532d22',
            color: msg.startsWith('Error') ? '#fca5a5' : '#4ade80',
            border: `1px solid ${msg.startsWith('Error') ? '#991b1b' : '#166534'}`,
          }}>
            {msg}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button onClick={() => { setInviteOpen(false); setMsg('') }} className="adm-btn">Cancel</button>
          <button onClick={sendInvite} className="adm-btn primary" disabled={saving || !inviteEmail.trim()}>
            {saving && <Spinner size={4} />} Send Invite
          </button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
