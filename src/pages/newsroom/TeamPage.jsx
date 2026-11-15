import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import AdminLayout from '../../components/admin/AdminLayout'
import { Spinner, Modal, Field } from '../../components/ui'
import { ArrowUpDown, Eye, EyeOff, ImageOff, Mail, Upload, UserRound } from 'lucide-react'

const ROLES = ['admin', 'exec', 'member', 'alumni']
const HEADSHOT_BUCKET = 'staff-headshots'
const PUBLIC_ROLES = [
  { value: 'exec', label: 'Executive', color: '#60a5fa' },
  { value: 'associate', label: 'Associate', color: '#2dd4bf' },
  { value: 'member', label: 'Member', color: '#a78bfa' },
]

function normalizeSocials(value) {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function cleanSocialValue(value) {
  return String(value || '').trim()
}

function socialInputValue(member, key) {
  return normalizeSocials(member.public_socials)[key] || ''
}

function defaultPublicRole(member) {
  if (member?.public_role) return member.public_role
  if (member?.role === 'exec' || member?.role === 'admin') return 'exec'
  return 'member'
}

function publicRoleLabel(value) {
  return PUBLIC_ROLES.find(role => role.value === value)?.label || 'Member'
}

function profileOrder(member) {
  const order = Number(member?.public_order)
  return Number.isFinite(order) ? order : 1000
}

function sortProfiles(a, b) {
  const orderDiff = profileOrder(a) - profileOrder(b)
  if (orderDiff !== 0) return orderDiff
  return String(a.full_name || '').localeCompare(String(b.full_name || ''))
}

function imageFileToElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image file.'))
    }
    image.src = url
  })
}

async function prepareHeadshot(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Choose a JPG, PNG, or WebP image.')

  const image = await imageFileToElement(file)
  const targetWidth = 800
  const targetHeight = 1000
  const targetRatio = targetWidth / targetHeight
  const sourceRatio = image.width / image.height
  const sourceWidth = sourceRatio > targetRatio ? image.height * targetRatio : image.width
  const sourceHeight = sourceRatio > targetRatio ? image.height : image.width / targetRatio
  const sourceX = (image.width - sourceWidth) / 2
  const sourceY = (image.height - sourceHeight) / 2
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const context = canvas.getContext('2d')
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight)

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.86))
  if (!blob) throw new Error('Could not prepare that headshot for upload.')
  return blob
}

export default function TeamPage() {
  const { profile } = useAuth()
  const isExec = profile?.role === 'exec'
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [loadWarning, setLoadWarning] = useState('')
  const [headshotUploading, setHeadshotUploading] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setLoadWarning('')

    let result = await supabase
      .from('profiles')
      .select('*')
      .order('public_role')
      .order('public_order')
      .order('full_name')

    if (result.error && result.error.message?.includes('public_order')) {
      setLoadWarning('Profile ordering needs the public_order Supabase column. The page is using name sorting until that SQL is added.')
      result = await supabase.from('profiles').select('*').order('full_name')
    }

    if (result.error) {
      setMsg(`Error: ${result.error.message}`)
      setMembers([])
    } else {
      setMembers(result.data || [])
    }
    setLoading(false)
  }

  async function updateProfile(id, patch) {
    if (!isExec) return
    const { error } = await supabase.from('profiles').update(patch).eq('id', id)
    if (error) {
      setMsg(`Error: ${error.message}`)
      return
    }
    setMsg('')
    setMembers(members => members.map(member => member.id === id ? { ...member, ...patch } : member))
  }

  async function updateRole(id, role) {
    if (!isExec) return
    await updateProfile(id, { role })
  }

  async function updateSocial(member, key, value) {
    if (!isExec) return
    const current = normalizeSocials(member.public_socials)
    const nextValue = cleanSocialValue(value)
    const next = { ...current }

    if (nextValue) next[key] = nextValue
    else delete next[key]

    await updateProfile(member.id, { public_socials: next })
  }

  async function sendInvite() {
    if (!isExec) return
    if (!inviteEmail.trim()) return
    setSaving(true)
    const { error } = await supabase.auth.admin.inviteUserByEmail(inviteEmail.trim())
    setSaving(false)
    if (error) setMsg(`Error: ${error.message}`)
    else {
      setMsg('Invite sent!')
      setInviteEmail('')
    }
  }

  async function uploadHeadshot(member, file) {
    if (!isExec || !file) return
    setHeadshotUploading(member.id)
    setMsg('')

    try {
      const blob = await prepareHeadshot(file)
      const path = `${member.id}/${Date.now()}-${Math.random().toString(16).slice(2)}.webp`
      const { data, error } = await supabase.storage
        .from(HEADSHOT_BUCKET)
        .upload(path, blob, {
          cacheControl: '31536000',
          contentType: 'image/webp',
          upsert: false,
        })

      if (error) throw error

      const { data: publicData } = supabase.storage
        .from(HEADSHOT_BUCKET)
        .getPublicUrl(data.path)

      await updateProfile(member.id, { public_headshot_url: publicData.publicUrl })
    } catch (error) {
      setMsg(`Error: ${error.message}. Run the latest Supabase migration if the headshot bucket is missing.`)
    } finally {
      setHeadshotUploading('')
    }
  }

  const visibleMembers = members.filter(member => member.public_visible !== false)
  const hiddenMembers = members.filter(member => member.public_visible === false).sort(sortProfiles)
  const groupedMembers = useMemo(() => Object.fromEntries(
    PUBLIC_ROLES.map(role => [
      role.value,
      visibleMembers
        .filter(member => defaultPublicRole(member) === role.value)
        .sort(sortProfiles),
    ])
  ), [visibleMembers])

  const orderedPublicCount = visibleMembers.length

  return (
    <AdminLayout>
      <div className="team-cms-header">
        <div>
          <span className="dashboard-context-badge public">Public Staff Profiles</span>
          <h1>Profile CMS</h1>
          <p>
            {isExec
              ? 'Control public staff names, roles, bios, socials, visibility, and the order shown on the About page.'
              : `${members.length} profile records · view-only for non-exec users`}
          </p>
        </div>
        {isExec && (
          <button onClick={() => setInviteOpen(true)} className="adm-btn primary"><Mail size={15} /> Invite Member</button>
        )}
      </div>

      {(loadWarning || msg) && (
        <div className={msg.startsWith('Error') ? 'adm-error-box' : 'adm-info-box'} style={{ marginBottom: 16 }}>
          {msg || loadWarning}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={6} /></div>
      ) : (
        <>
          <section className="team-cms-overview">
            <article>
              <span>Total Profiles</span>
              <strong>{members.length}</strong>
              <p>All sign-in profiles in Supabase.</p>
            </article>
            <article>
              <span>Public Profiles</span>
              <strong>{orderedPublicCount}</strong>
              <p>Visible on public staff pages.</p>
            </article>
            <article>
              <span>Hidden</span>
              <strong>{hiddenMembers.length}</strong>
              <p>System/admin accounts kept off the public site.</p>
            </article>
          </section>

          <div className="team-cms-groups">
            {PUBLIC_ROLES.map(role => (
              <ProfileGroup
                key={role.value}
                role={role}
                members={groupedMembers[role.value] || []}
                isExec={isExec}
                updateProfile={updateProfile}
                updateRole={updateRole}
                updateSocial={updateSocial}
                uploadHeadshot={uploadHeadshot}
                headshotUploading={headshotUploading}
              />
            ))}

            {hiddenMembers.length > 0 && (
              <ProfileGroup
                role={{ value: 'hidden', label: 'Hidden from Public Site', color: '#64748b' }}
                members={hiddenMembers}
                isExec={isExec}
                updateProfile={updateProfile}
                updateRole={updateRole}
                updateSocial={updateSocial}
                uploadHeadshot={uploadHeadshot}
                headshotUploading={headshotUploading}
                hidden
              />
            )}
          </div>
        </>
      )}

      <Modal open={inviteOpen} onClose={() => { setInviteOpen(false); setMsg('') }} title="Invite Member" size="sm">
        <Field label="Email *">
          <input className="adm-input" autoFocus type="email" value={inviteEmail}
            onChange={event => setInviteEmail(event.target.value)} placeholder="name@school.edu" />
        </Field>
        <Field label="Sign-in Role">
          <select className="adm-input" value={inviteRole} onChange={event => setInviteRole(event.target.value)}>
            {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
          </select>
        </Field>
        {msg && (
          <div className={msg.startsWith('Error') ? 'adm-error-box' : 'adm-info-box'}>
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

function ProfileGroup({ role, members, isExec, updateProfile, updateRole, updateSocial, uploadHeadshot, headshotUploading, hidden = false }) {
  return (
    <section className="profile-cms-group">
      <div className="profile-cms-group-head">
        <div>
          <span style={{ color: role.color }}>{role.label}</span>
          <strong>{members.length}</strong>
        </div>
        <p>
          {hidden
            ? 'These profiles are not listed publicly.'
            : 'Lower display order appears first inside this public category.'}
        </p>
      </div>

      {members.length === 0 ? (
        <div className="profile-cms-empty">No profiles in this group yet.</div>
      ) : (
        <div className="profile-cms-grid">
          {members.map(member => (
            <ProfileCard
              key={member.id}
              member={member}
              groupColor={role.color}
              isExec={isExec}
              updateProfile={updateProfile}
              updateRole={updateRole}
              updateSocial={updateSocial}
              uploadHeadshot={uploadHeadshot}
              headshotUploading={headshotUploading}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function ProfileCard({ member, groupColor, isExec, updateProfile, updateRole, updateSocial, uploadHeadshot, headshotUploading }) {
  const publicRole = defaultPublicRole(member)

  return (
    <article className={`profile-cms-card ${member.public_visible === false ? 'is-hidden' : ''}`}>
      <div className="profile-cms-card-top">
        <div className="profile-cms-avatar" style={{ color: groupColor, background: `${groupColor}22` }}>
          {member.public_headshot_url ? (
            <img src={member.public_headshot_url} alt="" />
          ) : (
            member.full_name?.slice(0, 1) || <UserRound size={16} />
          )}
        </div>
        <div>
          {isExec ? (
            <input
              className="adm-input profile-cms-name-input"
              defaultValue={member.full_name || ''}
              onBlur={event => {
                const next = event.target.value.trim()
                if (next && next !== member.full_name) updateProfile(member.id, { full_name: next })
              }}
            />
          ) : (
            <h2>{member.full_name}</h2>
          )}
          <p>{member.public_title || publicRoleLabel(publicRole)}</p>
        </div>
        <span className={`profile-cms-visibility ${member.public_visible === false ? 'hidden' : ''}`}>
          {member.public_visible === false ? <EyeOff size={13} /> : <Eye size={13} />}
          {member.public_visible === false ? 'Hidden' : 'Public'}
        </span>
      </div>

      {isExec ? (
        <div className="profile-cms-form">
          <label>
            <span>Display order</span>
            <div className="profile-order-input">
              <ArrowUpDown size={14} />
              <input
                className="adm-input"
                type="number"
                defaultValue={member.public_order ?? 0}
                onBlur={event => {
                  const next = Number.parseInt(event.target.value, 10)
                  const normalized = Number.isFinite(next) ? next : 0
                  if (normalized !== (member.public_order ?? 0)) updateProfile(member.id, { public_order: normalized })
                }}
              />
            </div>
          </label>

          <label>
            <span>Public category</span>
            <select className="adm-input" value={publicRole} onChange={event => updateProfile(member.id, { public_role: event.target.value })}>
              {PUBLIC_ROLES.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
          </label>

          <label>
            <span>Sign-in role</span>
            <select className="adm-input" value={member.role || 'member'} onChange={event => updateRole(member.id, event.target.value)}>
              {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>

          <label className="profile-cms-wide">
            <span>Public title</span>
            <input
              className="adm-input"
              defaultValue={member.public_title || ''}
              onBlur={event => {
                if (event.target.value !== (member.public_title || '')) updateProfile(member.id, { public_title: event.target.value })
              }}
              placeholder="Example: Executive Producer"
            />
          </label>

          <label className="profile-cms-wide">
            <span>Public description</span>
            <textarea
              className="adm-input"
              rows={3}
              defaultValue={member.public_description || ''}
              onBlur={event => {
                if (event.target.value !== (member.public_description || '')) updateProfile(member.id, { public_description: event.target.value })
              }}
              placeholder="Example: Oversees editing workflow, publishing, and post-production standards."
            />
          </label>

          <div className="profile-cms-headshot profile-cms-wide">
            <div>
              <span>Public headshot</span>
              <small>Images are centered, cropped to 4:5, and stored as WebP.</small>
            </div>
            <div className="profile-cms-headshot-actions">
              <label className={`adm-btn ${headshotUploading === member.id ? 'disabled' : ''}`}>
                <Upload size={14} />
                {headshotUploading === member.id ? 'Uploading...' : member.public_headshot_url ? 'Replace photo' : 'Upload photo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={headshotUploading === member.id}
                  onChange={event => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    uploadHeadshot(member, file)
                  }}
                />
              </label>
              {member.public_headshot_url && (
                <button type="button" className="adm-btn" onClick={() => updateProfile(member.id, { public_headshot_url: '' })}>
                  <ImageOff size={14} /> Remove photo
                </button>
              )}
            </div>
          </div>

          <div className="profile-cms-socials">
            <span>Public socials</span>
            <label>
              Instagram
              <input
                className="adm-input"
                defaultValue={socialInputValue(member, 'instagram')}
                onBlur={event => updateSocial(member, 'instagram', event.target.value)}
                placeholder="@username or https://instagram.com/username"
              />
            </label>
            <label>
              LinkedIn
              <input
                className="adm-input"
                defaultValue={socialInputValue(member, 'linkedin')}
                onBlur={event => updateSocial(member, 'linkedin', event.target.value)}
                placeholder="https://www.linkedin.com/in/username"
              />
            </label>
          </div>

          <label className="profile-cms-visible-toggle">
            <span>
              Show on public site
              <small>Turn off for TNN Admin or system accounts.</small>
            </span>
            <input
              type="checkbox"
              checked={member.public_visible !== false}
              onChange={event => updateProfile(member.id, { public_visible: event.target.checked })}
            />
          </label>
        </div>
      ) : (
        <div className="profile-cms-readonly">
          <p>Order {member.public_order ?? 0} · {publicRoleLabel(publicRole)} · Sign-in role {member.role || 'member'}</p>
          {member.public_description && <p>{member.public_description}</p>}
          {member.public_headshot_url && <p>Public headshot uploaded</p>}
          {socialInputValue(member, 'instagram') && <p>Instagram: {socialInputValue(member, 'instagram')}</p>}
          {socialInputValue(member, 'linkedin') && <p>LinkedIn: {socialInputValue(member, 'linkedin')}</p>}
        </div>
      )}
    </article>
  )
}
