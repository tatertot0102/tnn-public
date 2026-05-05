import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import AdminLayout from '../../components/admin/AdminLayout'
import { PriorityBadge, Spinner, Modal, Field } from '../../components/ui'
import { PRIORITIES } from '../../lib/constants'
import { Plus, Check, Trash2 } from 'lucide-react'
import { format, isBefore, isToday } from 'date-fns'

const STATUSES = ['todo', 'in-progress', 'done']

export default function TasksPage() {
  const { isExec, profile } = useAuth()
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('todo')
  const [form, setForm] = useState({ title: '', priority: 'medium', due_date: '', assignee_ids: [], status: 'todo' })

  useEffect(() => { load() }, [profile])

  async function load() {
    if (!profile) return
    setLoading(true)
    const [tasksRes, membersRes] = await Promise.all([
      isExec
        ? supabase.from('tasks').select('*').order('due_date').order('created_at')
        : supabase.from('tasks').select('*').contains('assignee_ids', [profile.id]).order('due_date'),
      supabase.from('profiles').select('id, full_name'),
    ])
    setTasks(tasksRes.data || [])
    setMembers(membersRes.data || [])
    setLoading(false)
  }

  async function createTask() {
    if (!form.title.trim()) return
    setSaving(true)
    await supabase.from('tasks').insert({ ...form, title: form.title.trim() })
    setSaving(false)
    setAddOpen(false)
    setForm({ title: '', priority: 'medium', due_date: '', assignee_ids: [], status: 'todo' })
    load()
  }

  async function updateStatus(id, status) {
    await supabase.from('tasks').update({ status }).eq('id', id)
    setTasks(t => t.map(x => x.id === id ? { ...x, status } : x))
  }

  async function deleteTask(id) {
    if (!confirm('Delete this task?')) return
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(t => t.filter(x => x.id !== id))
  }

  function toggleAssignee(userId) {
    setForm(f => ({
      ...f,
      assignee_ids: f.assignee_ids.includes(userId)
        ? f.assignee_ids.filter(id => id !== userId)
        : [...f.assignee_ids, userId],
    }))
  }

  const today = new Date()
  const filtered = tasks.filter(t => !filterStatus || t.status === filterStatus)

  const columns = {
    todo: filtered.filter(t => t.status === 'todo'),
    'in-progress': filtered.filter(t => t.status === 'in-progress'),
    done: filtered.filter(t => t.status === 'done'),
  }

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--adm-text)' }}>Tasks</h1>
          <p style={{ color: 'var(--adm-muted)', fontSize: 13, marginTop: 3 }}>{tasks.filter(t => t.status !== 'done').length} open</p>
        </div>
        {isExec && <button onClick={() => setAddOpen(true)} className="adm-btn primary"><Plus size={15} /> Add Task</button>}
      </div>

      {/* Kanban */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={6} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { key: 'todo', label: 'To Do', color: '#64748b' },
            { key: 'in-progress', label: 'In Progress', color: '#f59e0b' },
            { key: 'done', label: 'Done', color: '#22c55e' },
          ].map(col => (
            <div key={col.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--adm-muted)', textTransform: 'uppercase', letterSpacing: 0 }}>{col.label}</span>
                <span style={{ fontSize: 11, color: 'var(--adm-muted)', background: 'var(--adm-surface2)', padding: '1px 7px', borderRadius: 10 }}>
                  {columns[col.key].length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {columns[col.key].map(task => {
                  const isOverdue = task.due_date && !task.status === 'done' && isBefore(new Date(task.due_date), today) && !isToday(new Date(task.due_date))
                  const assigneeNames = (task.assignee_ids || [])
                    .map(id => members.find(m => m.id === id)?.full_name)
                    .filter(Boolean)
                  return (
                    <div key={task.id} className="adm-card" style={{ padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                        <p style={{ fontSize: 13, color: 'var(--adm-text)', fontWeight: 500, lineHeight: 1.4 }}>{task.title}</p>
                        {isExec && (
                          <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', color: 'var(--adm-muted)', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <PriorityBadge value={task.priority} />
                        {task.due_date && (
                          <span style={{ fontSize: 10, color: isOverdue ? '#f87171' : 'var(--adm-muted)' }}>
                            {format(new Date(task.due_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                      {assigneeNames.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {assigneeNames.map(name => (
                            <span key={name} style={{ fontSize: 10, background: 'var(--adm-surface2)', color: 'var(--adm-muted)', padding: '1px 7px', borderRadius: 10 }}>
                              {name.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Status actions */}
                      <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                        {col.key !== 'todo' && (
                          <button onClick={() => updateStatus(task.id, 'todo')} className="adm-btn" style={{ fontSize: 10, padding: '3px 8px' }}>← To Do</button>
                        )}
                        {col.key === 'todo' && (
                          <button onClick={() => updateStatus(task.id, 'in-progress')} className="adm-btn" style={{ fontSize: 10, padding: '3px 8px' }}>Start →</button>
                        )}
                        {col.key === 'in-progress' && (
                          <button onClick={() => updateStatus(task.id, 'done')} className="adm-btn primary" style={{ fontSize: 10, padding: '3px 8px' }}>
                            <Check size={11} /> Done
                          </button>
                        )}
                        {col.key === 'done' && (
                          <button onClick={() => updateStatus(task.id, 'in-progress')} className="adm-btn" style={{ fontSize: 10, padding: '3px 8px' }}>Reopen</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Task" size="sm">
        <Field label="Title *">
          <input className="adm-input" autoFocus value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && createTask()}
            placeholder="Task title..." />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Priority">
            <select className="adm-input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              {Object.entries(PRIORITIES).map(([v, p]) => <option key={v} value={v}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Due Date">
            <input className="adm-input" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </Field>
        </div>
        <Field label="Assign To">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
            {members.map(m => (
              <button key={m.id} type="button" onClick={() => toggleAssignee(m.id)} style={{
                fontSize: 12, padding: '4px 10px', borderRadius: 20,
                border: '1px solid',
                borderColor: form.assignee_ids.includes(m.id) ? 'var(--adm-accent)' : 'var(--adm-border2)',
                background: form.assignee_ids.includes(m.id) ? 'var(--adm-accent)' : 'transparent',
                color: form.assignee_ids.includes(m.id) ? '#fff' : 'var(--adm-muted)',
                cursor: 'pointer',
              }}>
                {m.full_name.split(' ')[0]}
              </button>
            ))}
          </div>
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button onClick={() => setAddOpen(false)} className="adm-btn">Cancel</button>
          <button onClick={createTask} className="adm-btn primary" disabled={saving || !form.title.trim()}>
            {saving && <Spinner size={4} />} Add Task
          </button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
