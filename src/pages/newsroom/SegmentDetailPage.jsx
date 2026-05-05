import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import AdminLayout from '../../components/admin/AdminLayout'
import { PriorityBadge, StatusBadge, DeptBadge, Spinner, Modal, Field } from '../../components/ui'
import { PRIORITIES, STATUSES, DEPARTMENTS, PRIMARY_ROLES, SECONDARY_ROLES } from '../../lib/constants'
import { format, isBefore, isToday } from 'date-fns'
import { Plus, Trash2, Check, ArrowLeft, ExternalLink, X, Flag, Pencil, Link2, UserPlus } from 'lucide-react'

export default function SegmentDetailPage() {
  const { id } = useParams()
  const { isExec, profile } = useAuth()
  const navigate = useNavigate()

  const [seg, setSeg] = useState(null)
  const [subtasks, setSubtasks] = useState([])
  const [milestones, setMilestones] = useState([])
  const [roles, setRoles] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [newSubtask, setNewSubtask] = useState('')
  const [newMilestone, setNewMilestone] = useState('')
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [guestUserId, setGuestUserId] = useState('')
  const [guestRole, setGuestRole] = useState('')
  const [submitTask, setSubmitTask] = useState(null)
  const [submitUrl, setSubmitUrl] = useState('')

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    setLoading(true)
    const [{ data: segment }, { data: subs }, { data: miles }, { data: segRoles }, { data: allMembers }] =
      await Promise.all([
        supabase.from('segments').select('*').eq('id', id).single(),
        supabase.from('subtasks').select('*').eq('segment_id', id).order('position').order('created_at'),
        supabase.from('milestones').select('*').eq('segment_id', id).order('position').order('created_at'),
        supabase.from('segment_roles').select('*, profiles(full_name, id)').eq('segment_id', id),
        supabase.from('profiles').select('id, full_name, role'),
      ])
    setSeg(segment)
    setSubtasks(subs ?? [])
    setMilestones(miles ?? [])
    setRoles(segRoles ?? [])
    setMembers(allMembers ?? [])
    setLoading(false)
  }

  const isMemberOnSegment = useMemo(() => roles.some(r => r.user_id === profile?.id), [roles, profile])
  const canEdit = isExec || isMemberOnSegment

  async function updateSeg(field, value) {
    if (!canEdit) return
    setSaving(true)
    await supabase.from('segments').update({ [field]: value }).eq('id', id)
    setSeg(s => ({ ...s, [field]: value }))
    setSaving(false)
  }

  async function deleteSegment() {
    if (!isExec || !confirm(`Delete "${seg.title}"?`)) return
    await supabase.from('segments').delete().eq('id', id)
    navigate('/newsroom/segments')
  }

  // Subtasks
  async function addSubtask(title, milestoneId = null) {
    if (!canEdit) return
    const { data } = await supabase.from('subtasks').insert({ segment_id: id, title, completed: false, milestone_id: milestoneId, assignee_ids: [] }).select('*').single()
    setSubtasks(s => [...s, data])
  }

  async function toggleSubtask(subtaskId, completed) {
    await supabase.from('subtasks').update({ completed: !completed }).eq('id', subtaskId)
    setSubtasks(s => s.map(t => t.id === subtaskId ? { ...t, completed: !completed } : t))
  }

  async function deleteSubtask(subtaskId) {
    if (!isExec) return
    await supabase.from('subtasks').delete().eq('id', subtaskId)
    setSubtasks(s => s.filter(t => t.id !== subtaskId))
  }

  async function assignSubtask(subtaskId, userId) {
    const task = subtasks.find(t => t.id === subtaskId)
    if (!task) return
    const ids = Array.isArray(task.assignee_ids) ? task.assignee_ids : []
    const next = ids.includes(userId) ? ids.filter(i => i !== userId) : [...ids, userId]
    await supabase.from('subtasks').update({ assignee_ids: next }).eq('id', subtaskId)
    setSubtasks(s => s.map(t => t.id === subtaskId ? { ...t, assignee_ids: next } : t))
  }

  async function saveSubmitUrl() {
    if (!submitTask) return
    await supabase.from('subtasks').update({ submit_url: submitUrl || null }).eq('id', submitTask.id)
    setSubtasks(s => s.map(t => t.id === submitTask.id ? { ...t, submit_url: submitUrl || null } : t))
    setSubmitTask(null)
    setSubmitUrl('')
  }

  // Milestones
  async function addMilestone() {
    if (!newMilestone.trim() || !isExec) return
    const { data } = await supabase.from('milestones').insert({ segment_id: id, title: newMilestone.trim(), position: milestones.length }).select().single()
    setMilestones(m => [...m, data])
    setNewMilestone('')
  }

  async function deleteMilestone(milestoneId) {
    if (!isExec || !confirm('Delete milestone? Subtasks will be ungrouped.')) return
    await supabase.from('milestones').delete().eq('id', milestoneId)
    setMilestones(m => m.filter(x => x.id !== milestoneId))
    setSubtasks(s => s.map(t => t.milestone_id === milestoneId ? { ...t, milestone_id: null } : t))
  }

  // Roles
  async function addRole(roleType, userId) {
    if (!isExec || !userId) return
    const { data } = await supabase.from('segment_roles').insert({ segment_id: id, user_id: userId, role_type: roleType, is_guest: false }).select('*, profiles(full_name, id)').single()
    if (data) setRoles(r => [...r, data])
  }

  async function removeRole(roleId) {
    if (!isExec) return
    await supabase.from('segment_roles').delete().eq('id', roleId)
    setRoles(r => r.filter(x => x.id !== roleId))
  }

  async function addGuest() {
    if (!guestUserId || !guestRole) return
    const { data } = await supabase.from('segment_roles').insert({ segment_id: id, user_id: guestUserId, role_type: guestRole, is_guest: true }).select('*, profiles(full_name, id)').single()
    if (data) { setRoles(r => [...r, data]); setShowGuestModal(false); setGuestUserId(''); setGuestRole('') }
  }

  if (loading) return <AdminLayout><div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={8} /></div></AdminLayout>
  if (!seg) return <AdminLayout><p style={{ color: 'var(--adm-muted)' }}>Segment not found.</p></AdminLayout>

  const permanentRoles = roles.filter(r => !r.is_guest)
  const guestRoles = roles.filter(r => r.is_guest)
  const segmentMemberIds = [...new Set(roles.map(r => r.user_id))]
  const segmentMembers = members.filter(m => segmentMemberIds.includes(m.id))
  const ungrouped = subtasks.filter(t => !t.milestone_id)
  const completedCount = subtasks.filter(t => t.completed).length
  const today = new Date()
  const overdueCount = subtasks.filter(t => t.due_date && !t.completed && isBefore(new Date(t.due_date), today) && !isToday(new Date(t.due_date))).length

  const tabs = ['overview', 'subtasks', 'roles', 'notes']

  return (
    <AdminLayout>
      <button onClick={() => navigate('/newsroom/segments')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--adm-muted)', background: 'none', border: 'none', marginBottom: 20, cursor: 'pointer' }}>
        <ArrowLeft size={15} /> Back to Segments
      </button>

      {/* Header card */}
      <div className="adm-card" style={{ marginBottom: 20, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {canEdit ? (
              <input style={{ fontSize: 22, fontWeight: 700, color: 'var(--adm-text)', background: 'transparent', border: 'none', outline: 'none', width: '100%' }}
                value={seg.title} onChange={e => setSeg(s => ({ ...s, title: e.target.value }))}
                onBlur={e => updateSeg('title', e.target.value)} />
            ) : (
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--adm-text)' }}>{seg.title}</h1>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {seg.departments?.map(d => <DeptBadge key={d} value={d} />)}
            </div>
            {seg.drive_url && (
              <a href={seg.drive_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--adm-accent)', marginTop: 8 }}>
                <ExternalLink size={12} /> Open Drive Folder
              </a>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {saving && <Spinner size={4} />}
            {isExec ? (
              <>
                <select className="adm-input" style={{ width: 'auto', fontSize: 12 }} value={seg.priority} onChange={e => updateSeg('priority', e.target.value)}>
                  {Object.entries(PRIORITIES).map(([v, p]) => <option key={v} value={v}>{p.label}</option>)}
                </select>
                <select className="adm-input" style={{ width: 'auto', fontSize: 12 }} value={seg.status} onChange={e => updateSeg('status', e.target.value)}>
                  {Object.entries(STATUSES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                </select>
                <button onClick={deleteSegment} className="adm-btn danger" style={{ fontSize: 12, padding: '6px 12px' }}>
                  <Trash2 size={13} /> Delete
                </button>
              </>
            ) : (
              <><PriorityBadge value={seg.priority} /><StatusBadge value={seg.status} /></>
            )}
          </div>
        </div>

        {/* Dates + progress */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--adm-border)' }}>
          {[{ label: 'Start', field: 'start_date' }, { label: 'Due', field: 'due_date' }].map(({ label, field }) => (
            <div key={field}>
              <p style={{ fontSize: 11, color: 'var(--adm-muted)', marginBottom: 4 }}>{label}</p>
              {isExec ? (
                <input className="adm-input" type="date" style={{ fontSize: 12 }} value={seg[field] ?? ''} onChange={e => updateSeg(field, e.target.value || null)} />
              ) : (
                <p style={{ fontSize: 13, color: 'var(--adm-text)' }}>{seg[field] ? format(new Date(seg[field]), 'MMM d, yyyy') : '—'}</p>
              )}
            </div>
          ))}
          <div>
            <p style={{ fontSize: 11, color: 'var(--adm-muted)', marginBottom: 4 }}>Progress</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 6, background: 'var(--adm-surface2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--adm-accent)', borderRadius: 3, width: subtasks.length ? `${Math.round(completedCount / subtasks.length * 100)}%` : '0%', transition: 'width 0.3s' }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--adm-muted)' }}>{completedCount}/{subtasks.length}</span>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--adm-muted)', marginBottom: 4 }}>Team</p>
            <p style={{ fontSize: 13, color: 'var(--adm-text)' }}>
              {permanentRoles.length} crew{guestRoles.length > 0 ? ` + ${guestRoles.length} guest${guestRoles.length > 1 ? 's' : ''}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--adm-border)', marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 500,
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: activeTab === t ? '2px solid var(--adm-accent)' : '2px solid transparent',
            color: activeTab === t ? 'var(--adm-accent)' : 'var(--adm-muted)',
            textTransform: 'capitalize', marginBottom: -1,
          }}>
            {t}
            {t === 'subtasks' && overdueCount > 0 && (
              <span style={{ marginLeft: 6, background: '#7f1d1d', color: '#fca5a5', fontSize: 10, padding: '1px 5px', borderRadius: 4 }}>
                {overdueCount} overdue
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="adm-card">
            <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-muted)', textTransform: 'uppercase', letterSpacing: 0, marginBottom: 16 }}>Team</h3>
            {PRIMARY_ROLES.map(role => {
              const assigned = permanentRoles.filter(r => r.role_type === role)
              return (
                <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--adm-muted)', width: 100, flexShrink: 0 }}>{role}</span>
                  {assigned.length === 0 ? <span style={{ fontSize: 12, color: '#333', fontStyle: 'italic' }}>Unassigned</span> : (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {assigned.map(r => (
                        <span key={r.id} style={{ fontSize: 11, background: 'var(--adm-surface2)', color: 'var(--adm-muted)', padding: '2px 8px', borderRadius: 12 }}>
                          {r.profiles?.full_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="adm-card">
            <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-muted)', textTransform: 'uppercase', letterSpacing: 0, marginBottom: 16 }}>Progress</h3>
            {subtasks.length === 0 ? (
              <p style={{ color: 'var(--adm-muted)', fontSize: 13 }}>No subtasks yet.</p>
            ) : (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--adm-muted)', marginBottom: 4 }}>
                    <span>Overall</span><span>{completedCount}/{subtasks.length}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--adm-surface2)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--adm-accent)', width: `${Math.round(completedCount / subtasks.length * 100)}%`, borderRadius: 4 }} />
                  </div>
                </div>
                {milestones.map(m => {
                  const mSubs = subtasks.filter(t => t.milestone_id === m.id)
                  const mDone = mSubs.filter(t => t.completed).length
                  if (!mSubs.length) return null
                  return (
                    <div key={m.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--adm-muted)', marginBottom: 4 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Flag size={10} />{m.title}</span>
                        <span>{mDone}/{mSubs.length}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--adm-surface2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: mDone === mSubs.length ? '#22c55e' : 'var(--adm-accent)', width: `${Math.round(mDone / mSubs.length * 100)}%` }} />
                      </div>
                    </div>
                  )
                })}
                {overdueCount > 0 && (
                  <div style={{ background: '#7f1d1d22', border: '1px solid #991b1b', borderRadius: 8, padding: '8px 12px', marginTop: 8, fontSize: 12, color: '#fca5a5' }}>
                    {overdueCount} subtask{overdueCount > 1 ? 's' : ''} overdue
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtasks */}
      {activeTab === 'subtasks' && (
        <div>
          {milestones.map(m => {
            const mSubs = subtasks.filter(t => t.milestone_id === m.id)
            const done = mSubs.filter(t => t.completed).length
            return (
              <div key={m.id} style={{ border: '1px solid var(--adm-border)', borderRadius: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: mSubs.length > 0 ? '1px solid var(--adm-border)' : 'none' }}>
                  <Flag size={13} style={{ color: 'var(--adm-accent)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--adm-text)', flex: 1 }}>{m.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--adm-muted)' }}>{done}/{mSubs.length}</span>
                  {isExec && <button onClick={() => deleteMilestone(m.id)} style={{ background: 'none', border: 'none', color: 'var(--adm-muted)', cursor: 'pointer' }}><Trash2 size={13} /></button>}
                </div>
                <div style={{ padding: '8px 16px' }}>
                  {mSubs.map(t => <SubtaskRow key={t.id} task={t} members={segmentMembers} profile={profile} isExec={isExec} canEdit={canEdit} onToggle={toggleSubtask} onDelete={deleteSubtask} onAssign={assignSubtask} onSubmit={t => { setSubmitTask(t); setSubmitUrl(t.submit_url || '') }} today={today} />)}
                  {canEdit && (
                    <AddSubtaskInput placeholder={`Add to ${m.title}...`} onAdd={title => addSubtask(title, m.id)} />
                  )}
                </div>
              </div>
            )
          })}

          <div className="adm-card">
            {milestones.length > 0 && <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0, textTransform: 'uppercase', color: 'var(--adm-muted)', marginBottom: 12 }}>Ungrouped</p>}
            {ungrouped.map(t => <SubtaskRow key={t.id} task={t} members={segmentMembers} profile={profile} isExec={isExec} canEdit={canEdit} onToggle={toggleSubtask} onDelete={deleteSubtask} onAssign={assignSubtask} onSubmit={t => { setSubmitTask(t); setSubmitUrl(t.submit_url || '') }} today={today} />)}
            {ungrouped.length === 0 && milestones.length === 0 && <p style={{ color: 'var(--adm-muted)', fontSize: 13, marginBottom: 12 }}>No subtasks yet.</p>}
            {canEdit && <AddSubtaskInput placeholder="Add a subtask..." onAdd={title => addSubtask(title, null)} />}
          </div>

          {isExec && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input className="adm-input" style={{ flex: 1 }} placeholder="New milestone name..." value={newMilestone}
                onChange={e => setNewMilestone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addMilestone()} />
              <button onClick={addMilestone} className="adm-btn">
                <Flag size={14} style={{ color: 'var(--adm-accent)' }} /> Add Milestone
              </button>
            </div>
          )}
        </div>
      )}

      {/* Roles */}
      {activeTab === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="adm-card">
            <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-muted)', textTransform: 'uppercase', letterSpacing: 0, marginBottom: 16 }}>Primary Roles</h3>
            {PRIMARY_ROLES.map(role => {
              const assigned = permanentRoles.filter(r => r.role_type === role)
              return (
                <div key={role} style={{ padding: '12px', background: 'var(--adm-surface2)', borderRadius: 8, marginBottom: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-text)', marginBottom: 8 }}>{role}</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {assigned.map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--adm-border2)', borderRadius: 20, padding: '3px 10px 3px 10px', fontSize: 12, color: 'var(--adm-text)' }}>
                        {r.profiles?.full_name}
                        {isExec && <button onClick={() => removeRole(r.id)} style={{ background: 'none', border: 'none', color: 'var(--adm-muted)', cursor: 'pointer', marginLeft: 2 }}><X size={11} /></button>}
                      </div>
                    ))}
                    {assigned.length === 0 && <span style={{ fontSize: 12, color: '#444', fontStyle: 'italic' }}>No one assigned</span>}
                  </div>
                  {isExec && (
                    <select className="adm-input" style={{ fontSize: 12, width: 'auto' }} value="" onChange={e => e.target.value && addRole(role, e.target.value)}>
                      <option value="">+ Add person...</option>
                      {members.filter(m => !assigned.find(r => r.user_id === m.id)).map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                    </select>
                  )}
                </div>
              )
            })}
          </div>

          <div className="adm-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-muted)', textTransform: 'uppercase', letterSpacing: 0 }}>Guests</h3>
              {isExec && <button onClick={() => setShowGuestModal(true)} className="adm-btn" style={{ fontSize: 12 }}><UserPlus size={13} /> Add Guest</button>}
            </div>
            {guestRoles.length === 0 ? <p style={{ color: 'var(--adm-muted)', fontSize: 13 }}>No guests.</p> : guestRoles.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#78350f11', border: '1px solid #78350f44', borderRadius: 8, marginBottom: 6 }}>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--adm-text)' }}>{r.profiles?.full_name}</p>
                  <p style={{ fontSize: 11, color: 'var(--adm-muted)' }}>{r.role_type}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, background: '#78350f33', color: '#fcd34d', padding: '2px 8px', borderRadius: 6 }}>Guest</span>
                  {isExec && <button onClick={() => removeRole(r.id)} style={{ background: 'none', border: 'none', color: 'var(--adm-muted)', cursor: 'pointer' }}><X size={13} /></button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {activeTab === 'notes' && (
        <div className="adm-card">
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--adm-text)', marginBottom: 16 }}>Notes & Instructions</h3>
          {canEdit ? (
            <textarea className="adm-input" rows={14} style={{ resize: 'vertical' }}
              placeholder="Add notes, instructions, or context..."
              value={seg.notes ?? ''}
              onChange={e => setSeg(s => ({ ...s, notes: e.target.value }))}
              onBlur={e => updateSeg('notes', e.target.value)} />
          ) : (
            <p style={{ fontSize: 14, color: 'var(--adm-text)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {seg.notes || <span style={{ color: 'var(--adm-muted)' }}>No notes added.</span>}
            </p>
          )}
        </div>
      )}

      {/* Guest modal */}
      <Modal open={showGuestModal} onClose={() => setShowGuestModal(false)} title="Add Guest" size="sm">
        <Field label="Person">
          <select className="adm-input" value={guestUserId} onChange={e => setGuestUserId(e.target.value)}>
            <option value="">Select member...</option>
            {members.filter(m => !roles.find(r => r.user_id === m.id && !r.is_guest)).map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
        </Field>
        <Field label="Role">
          <select className="adm-input" value={guestRole} onChange={e => setGuestRole(e.target.value)}>
            <option value="">Select role...</option>
            {[...PRIMARY_ROLES, ...SECONDARY_ROLES, 'Guest Contributor'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button onClick={() => setShowGuestModal(false)} className="adm-btn">Cancel</button>
          <button onClick={addGuest} className="adm-btn primary" disabled={!guestUserId || !guestRole}>Add Guest</button>
        </div>
      </Modal>

      {/* Submit URL modal */}
      <Modal open={!!submitTask} onClose={() => setSubmitTask(null)} title="Submit Link" size="sm">
        <Field label="Deliverable URL">
          <input className="adm-input" autoFocus placeholder="https://..." value={submitUrl}
            onChange={e => setSubmitUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveSubmitUrl()} />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button onClick={() => setSubmitTask(null)} className="adm-btn">Cancel</button>
          <button onClick={saveSubmitUrl} className="adm-btn primary">Save</button>
        </div>
      </Modal>
    </AdminLayout>
  )
}

function SubtaskRow({ task, members, profile, isExec, canEdit, onToggle, onDelete, onAssign, onSubmit, today }) {
  const assigneeIds = Array.isArray(task.assignee_ids) ? task.assignee_ids : []
  const assigneeNames = assigneeIds.map(id => members.find(m => m.id === id)?.full_name).filter(Boolean)
  const isOverdue = task.due_date && !task.completed && isBefore(new Date(task.due_date), today) && !isToday(new Date(task.due_date))
  const canSubmit = isExec || assigneeIds.includes(profile?.id)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--adm-border)', fontSize: 13 }}>
      <button onClick={() => canEdit && onToggle(task.id, task.completed)} style={{
        width: 18, height: 18, borderRadius: 4, border: `1px solid`,
        borderColor: task.completed ? '#22c55e' : 'var(--adm-border2)',
        background: task.completed ? '#22c55e' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: canEdit ? 'pointer' : 'default', flexShrink: 0,
      }}>
        {task.completed && <Check size={11} color="white" />}
      </button>
      <span style={{ flex: 1, color: task.completed ? 'var(--adm-muted)' : 'var(--adm-text)', textDecoration: task.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {task.title}
      </span>
      {canSubmit && (
        task.submit_url ? (
          <a href={task.submit_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Link2 size={11} /> Submitted
          </a>
        ) : (
          <button onClick={() => onSubmit(task)} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--adm-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Link2 size={11} /> Submit
          </button>
        )
      )}
      {assigneeNames.length > 0 && (
        <div style={{ display: 'flex', gap: 3 }}>
          {assigneeNames.map(n => (
            <span key={n} style={{ fontSize: 10, background: 'var(--adm-surface2)', color: 'var(--adm-muted)', padding: '1px 6px', borderRadius: 10 }}>{n.split(' ')[0]}</span>
          ))}
        </div>
      )}
      {task.due_date && (
        <span style={{ fontSize: 11, color: isOverdue ? '#f87171' : 'var(--adm-muted)', flexShrink: 0 }}>
          {format(new Date(task.due_date), 'MMM d')}
        </span>
      )}
      {isExec && (
        <button onClick={() => onDelete(task.id)} style={{ background: 'none', border: 'none', color: 'var(--adm-muted)', cursor: 'pointer', opacity: 0, transition: 'opacity 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0}>
          <Trash2 size={12} />
        </button>
      )}
    </div>
  )
}

function AddSubtaskInput({ placeholder, onAdd }) {
  const [val, setVal] = useState('')
  function submit() { if (val.trim()) { onAdd(val.trim()); setVal('') } }
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <input className="adm-input" style={{ fontSize: 13 }} placeholder={placeholder} value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()} />
      <button onClick={submit} className="adm-btn" style={{ padding: '6px 12px' }}><Plus size={14} /></button>
    </div>
  )
}
