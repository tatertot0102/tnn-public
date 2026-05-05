import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Clapperboard, Edit3, Mic2, Users } from 'lucide-react'
import PublicLayout from '../../components/public/PublicLayout'
import { supabase } from '../../lib/supabase'
import { useSeoMeta } from '../../lib/seo'

const divisions = [
  {
    title: 'Pre-Production',
    icon: Edit3,
    body: 'Pitches, research, scripts, scheduling, and story approval before cameras roll.',
    roles: ['Writers', 'Pitch Editors', 'Producers'],
  },
  {
    title: 'Production',
    icon: Mic2,
    body: 'Anchoring, interviews, camera work, directing, and field coverage around school.',
    roles: ['Anchors', 'Directors', 'Camera Ops'],
  },
  {
    title: 'Post-Production',
    icon: Clapperboard,
    body: 'Editing, graphics, audio, publishing, and platform-specific finishing.',
    roles: ['Editors', 'Designers', 'Audio'],
  },
]

const formats = [
  'Desk reports',
  'Walk-and-talks',
  'On-site stand-ups',
  'Vox pops',
  'Interviews',
  'Montage recaps',
]

const PROFILE_ROLE_LABELS = {
  admin: 'Administrator',
  exec: 'Executive',
  member: 'Staff Member',
  alumni: 'Alumni',
}

function roleLabel(role) {
  if (!role) return 'Staff Member'
  return PROFILE_ROLE_LABELS[role] || role
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(word => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(' ')
}

function staffGroup(role) {
  if (role === 'admin' || role === 'exec') return 'Leadership'
  if (role === 'alumni') return 'Alumni'
  return 'Staff'
}

function staffBio(member) {
  const label = roleLabel(member.role).toLowerCase()
  return `${member.full_name} is listed as ${label} in the TNN staff system. Public video credits and profile activity appear on their creator page.`
}

function StaffGroup({ title, members }) {
  if (!members.length) return null

  return (
    <section className="info-staff-group">
      <div className="section-rule">
        <span className="section-rule-label">{title}</span>
        <div className="section-rule-line" />
      </div>
      <div className="info-staff-grid">
        {members.map(member => (
          <Link key={member.id} to={`/creators/${member.id}`} className="info-staff-card">
            <div>
              <span>{staffGroup(member.role)}</span>
              <h3>{member.full_name}</h3>
              <p>{staffBio(member)}</p>
            </div>
            <div className="info-role-list">
              <span>{roleLabel(member.role)}</span>
              <span>View profile</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function InfoPage() {
  const [staff, setStaff] = useState([])
  const [staffLoading, setStaffLoading] = useState(true)

  useSeoMeta({
    title: 'About TNN | Tech News Network',
    description: "Learn how Tech News Network works, what formats it produces, and who leads Brooklyn Tech's student-run video newsroom.",
    path: '/info',
    type: 'website',
  })

  useEffect(() => {
    async function loadStaff() {
      setStaffLoading(true)
      const publicResult = await supabase
        .from('public_profiles')
        .select('id, full_name, role')
        .order('full_name')

      if (!publicResult.error) {
        setStaff(publicResult.data || [])
        setStaffLoading(false)
        return
      }

      const fallbackResult = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .order('full_name')

      setStaff(fallbackResult.error ? [] : fallbackResult.data || [])
      setStaffLoading(false)
    }

    loadStaff()
  }, [])

  const groupedStaff = useMemo(() => ({
    leadership: staff.filter(member => staffGroup(member.role) === 'Leadership'),
    staff: staff.filter(member => staffGroup(member.role) === 'Staff'),
    alumni: staff.filter(member => staffGroup(member.role) === 'Alumni'),
  }), [staff])

  return (
    <PublicLayout>
      <main className="info-page">
        <section className="info-hero">
          <div>
            <span>About TNN</span>
            <h1>Student-led journalism, built for video.</h1>
          </div>
          <p>
            Tech News Network is Brooklyn Tech's student-run video newsroom. We report, film,
            edit, and publish stories for the school community across the web, YouTube, and Instagram.
          </p>
        </section>

        <section className="info-snapshot" aria-label="Newsroom snapshot">
          <article>
            <Users size={20} />
            <strong>{staffLoading ? '...' : staff.length}</strong>
            <span>listed staff members</span>
          </article>
          <article>
            <CalendarDays size={20} />
            <strong>2</strong>
            <span>main production days</span>
          </article>
          <article>
            <Clapperboard size={20} />
            <strong>{formats.length}</strong>
            <span>core segment formats</span>
          </article>
        </section>

        <section className="info-divisions">
          {divisions.map(({ title, icon: Icon, body, roles }) => (
            <article key={title}>
              <Icon size={22} />
              <h2>{title}</h2>
              <p>{body}</p>
              <div>
                {roles.map(role => <span key={role}>{role}</span>)}
              </div>
            </article>
          ))}
        </section>

        <section className="info-formats">
          <div>
            <span>What We Make</span>
            <h2>Clear formats, flexible reporting.</h2>
            <p>
              TNN stories range from quick student reactions to edited features and reported
              explainers. The goal is simple: make school stories understandable, useful, and watchable.
            </p>
          </div>
          <div className="info-format-list">
            {formats.map(format => <span key={format}>{format}</span>)}
          </div>
        </section>

        {staffLoading ? (
          <section className="info-staff-loading">
            Loading staff profiles...
          </section>
        ) : staff.length ? (
          <>
            <StaffGroup title="Leadership" members={groupedStaff.leadership} />
            <StaffGroup title="Staff" members={groupedStaff.staff} />
            <StaffGroup title="Alumni" members={groupedStaff.alumni} />
          </>
        ) : (
          <section className="info-staff-loading">
            Staff profiles will appear here once public profiles are available.
          </section>
        )}

        <section className="info-cta">
          <div>
            <span>Get Involved</span>
            <h2>Have a story idea or want to join?</h2>
            <p>Send us a tip, pitch a segment, or connect with the newsroom.</p>
          </div>
          <Link to="/videos">
            Watch TNN videos <ArrowRight size={15} />
          </Link>
        </section>
      </main>
    </PublicLayout>
  )
}
