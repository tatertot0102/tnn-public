import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import AdminLayout from '../../components/admin/AdminLayout'
import { StatusBadge, PriorityBadge, DeptBadge, Spinner, Modal, Field } from '../../components/ui'
import { STATUSES, PRIORITIES, DEPARTMENTS, SECTIONS, PRIMARY_ROLES } from '../../lib/constants'
import { Plus, Search } from 'lucide-react'
import { format, isBefore } from 'date-fns'

export default function SegmentsPage() {
  const { isExec, profile } = useAuth()
  const navigate = useNavigate()
  const [segments, setSegments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [newSeg, setNewSeg] = useState({ title: '', section: '', status: 'pitch', priority: 'medium', departments: [] })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [profile])

  async function load() {
    if (!profile) return
    setLoading(true)
    let data
    if (isExec) {
      const res = await supabase.from('segments').select('*, segment_roles(user_id, role_type, profiles(full_name))').order('created_at', { ascending: false })
      data = res.data
    } else {
      const { data: roles } = await supabase.from('segment_roles').select('segment_id').eq('user_id', profile.id)
      const ids = (roles || []).map(r => r.segment_id)
      if (!ids.length) { setSegments([]); setLoading(false); return }
      const res = await supabase.from('segments').select('*, segment_roles(user_id, role_type, profiles(full_name))').in('id', ids).order('created_at', { ascending: false })
      data = res.data
    }
    setSegments(data || [])
    setLoading(false)
  }

  async function createSegment() {
    if (!newSeg.title.trim()) return
    setSaving(true)
    const { data } = await supabase.from('segments').insert({ ...newSeg, title: newSeg.title.trim() }).select().single()
    setSaving(false)
    setAddOpen(false)
    setNewSeg({ title: '', section: '', status: 'pitch', priority: 'medium', departments: [] })
    if (data) navigate(`/newsroom/segments/${data.id}`)
  }

  const today = new Date()
  const filtered = segments.filter(s => {
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus && s.status !== filterStatus) return false
    return true
  })

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--adm-text)' }}>Segments</h1>
          <p style={{ color: 'var(--adm-muted)', fontSize: 13, marginTop: 3 }}>{segments.length} total</p>
        </div>
        {isExec && <button onClick={() => setAddOpen(true)} className="adm-btn primary"><Plus size={15} /> New Segment</button>}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-muted)' }} />
          <input className="adm-input" style={{ paddingLeft: 30 }} placeholder="Search segments..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="adm-input" style={{ maxWidth: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(STATUSES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={6} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 && <p style={{ color: 'var(--adm-muted)', fontSize: 13, padding: 20 }}>No segments found.</p>}
          {filtered.map(seg => {
            const isOverdue = seg.due_date && isBefore(new Date(seg.due_date), today) && seg.status !== 'done'
            return (
              <Link key={seg.id} to={`/newsroom/segments/${seg.id}`} style={{ textDecoration: 'none' }}>
                <div className="adm-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--adm-border2)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--adm-border)'}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--adm-text)' }}>{seg.title}</p>
                      {seg.departments?.map(d => <DeptBadge key={d} value={d} />)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--adm-muted)', marginTop: 4 }}>
                      {seg.segment_roles?.length || 0} crew members
                      {seg.due_date && <span style={{ marginLeft: 10, color: isOverdue ? '#f87171' : 'var(--adm-muted)' }}>
                        Due {format(new Date(seg.due_date), 'MMM d')}
                        {isOverdue && ' · OVERDUE'}
                      </span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <PriorityBadge value={seg.priority} />
                    <StatusBadge value={seg.status} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New Segment" size="sm">
        <Field label="Title *">
          <input className="adm-input" autoFocus value={newSeg.title} onChange={e => setNewSeg(s => ({ ...s, title: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && createSegment()} placeholder="Segment title..." />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Status">
            <select className="adm-input" value={newSeg.status} onChange={e => setNewSeg(s => ({ ...s, status: e.target.value }))}>
              {Object.entries(STATUSES).map(([v, st]) => <option key={v} value={v}>{st.label}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select className="adm-input" value={newSeg.priority} onChange={e => setNewSeg(s => ({ ...s, priority: e.target.value }))}>
              {Object.entries(PRIORITIES).map(([v, p]) => <option key={v} value={v}>{p.label}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button onClick={() => setAddOpen(false)} className="adm-btn">Cancel</button>
          <button onClick={createSegment} className="adm-btn primary" disabled={saving || !newSeg.title.trim()}>
            {saving && <Spinner size={4} />} Create
          </button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
