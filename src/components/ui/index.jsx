import { X } from 'lucide-react'
import { PRIORITIES, STATUSES, DEPARTMENTS, SECTION_COLORS } from '../../lib/constants'

export function Badge({ children, style, className = '' }) {
  return (
    <span className={`adm-badge ${className}`} style={style}>{children}</span>
  )
}

export function PriorityBadge({ value }) {
  const p = PRIORITIES[value] || PRIORITIES.medium
  return <span className={`adm-badge ${p.color}`}>{p.label}</span>
}

export function StatusBadge({ value }) {
  const s = STATUSES[value] || STATUSES.pitch
  return <span className={`adm-badge ${s.color}`}>{s.label}</span>
}

export function DeptBadge({ value }) {
  const d = DEPARTMENTS[value] || { label: value, color: 'bg-slate-800 text-slate-300' }
  return <span className={`adm-badge ${d.color}`}>{d.label}</span>
}

export function SectionBadge({ value }) {
  const color = SECTION_COLORS[value] || '#64748b'
  return (
    <span className="adm-badge" style={{ background: color + '22', color }}>
      {value}
    </span>
  )
}

export function Spinner({ size = 6 }) {
  const px = size * 4
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null
  const widths = { sm: 420, md: 560, lg: 720 }
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--adm-surface)',
        border: '1px solid var(--adm-border2)',
        borderRadius: 16,
        width: '100%',
        maxWidth: widths[size],
        maxHeight: '90vh',
        overflow: 'auto',
        padding: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--adm-text)' }}>{title}</h3>
          <button onClick={onClose} className="adm-btn" style={{ padding: '4px 8px' }}><X size={15} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--adm-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0 }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: 'var(--adm-muted)', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}
