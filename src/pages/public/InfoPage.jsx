import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Instagram, Mail, Newspaper, UserPlus, Youtube } from 'lucide-react'
import PublicLayout from '../../components/public/PublicLayout'
import { supabase } from '../../lib/supabase'
import { attachCreators, staffPath, visibleCredits } from '../../lib/creators'
import { useSeoMeta } from '../../lib/seo'

const OFFICIAL_LINKS = [
  { label: 'YouTube', href: 'https://www.youtube.com/@tnn_bths', icon: Youtube },
  { label: 'Instagram', href: 'https://www.instagram.com/tnn_bths/', icon: Instagram },
  { label: 'The Survey', href: 'https://surveybths.com/', icon: Newspaper },
  { label: 'Contact', href: 'mailto:bthstnn@gmail.com', icon: Mail },
  {
    label: 'Join TNN',
    href: 'https://docs.google.com/forms/d/e/1FAIpQLSdRQMvmPiVj1bT_l-Nh0IaplpyygUQgfHKp90AErUf2gKIqcQ/viewform?usp=header',
    icon: UserPlus,
  },
]

const JOIN_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdRQMvmPiVj1bT_l-Nh0IaplpyygUQgfHKp90AErUf2gKIqcQ/viewform?usp=header'

const PARTNERS = [
  {
    name: 'Columbia University Graduate School of Journalism',
    href: 'https://journalism.columbia.edu/',
    logo: '/partners/columbia-journalism.png',
    className: 'columbia',
  },
  {
    name: "The Survey, Brooklyn Tech's student newspaper",
    href: 'https://surveybths.com/',
    logo: '/partners/the-survey.png',
    className: 'survey',
  },
]

const PUBLIC_ROLE_LABELS = {
  exec: 'Executive',
  associate: 'Junior Executive',
  member: 'Member',
}

function publicRole(member) {
  if (member?.public_role) return member.public_role
  if (member?.role === 'admin' || member?.role === 'exec') return 'exec'
  return 'member'
}

function roleLabel(memberOrRole) {
  const role = typeof memberOrRole === 'string' ? memberOrRole : publicRole(memberOrRole)
  if (!role) return 'Member'
  return PUBLIC_ROLE_LABELS[role] || role
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(word => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(' ')
}

function publicTitle(member) {
  return member.public_title || ''
}

function staffBio(member) {
  return member.public_description || ''
}

function staffOrder(member) {
  const order = Number(member?.public_order)
  return Number.isFinite(order) ? order : 1000
}

function sortStaff(a, b) {
  const orderDiff = staffOrder(a) - staffOrder(b)
  if (orderDiff !== 0) return orderDiff
  return String(a.full_name || '').localeCompare(String(b.full_name || ''))
}

function StaffPortrait({ member }) {
  return (
    <div className="info-staff-portrait" aria-hidden="true">
      <span>{member.full_name?.slice(0, 1) || 'T'}</span>
      {member.public_headshot_url && (
        <img
          src={member.public_headshot_url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={event => { event.currentTarget.hidden = true }}
        />
      )}
    </div>
  )
}

function StaffGroup({ title, role, members }) {
  if (!members.length) return null

  return (
    <section className={`info-staff-group info-staff-group-${role}`}>
      <div className="info-staff-group-head">
        <h2>{title}</h2>
        <span>{members.length} {members.length === 1 ? 'person' : 'people'}</span>
      </div>
      <div className="info-staff-grid">
        {members.map(member => (
          <Link key={member.id} to={staffPath(member)} className="info-staff-card">
            <StaffPortrait member={member} />
            <div className="info-staff-card-copy">
              <h3>{member.full_name}</h3>
              {publicTitle(member) && <strong>{publicTitle(member)}</strong>}
              {staffBio(member) && <p>{staffBio(member)}</p>}
              <div className="info-staff-card-meta">
                <span>{roleLabel(member)}</span>
                <span>Profile <ArrowRight size={13} /></span>
              </div>
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
  const [publishedVideoCount, setPublishedVideoCount] = useState(0)

  useSeoMeta({
    title: 'About TNN | Tech News Network',
    description: "Meet Tech News Network, Brooklyn Tech's student-run broadcast newsroom, and the students behind its reporting.",
    path: '/about/',
    type: 'website',
    keywords: `TNN staff, Tech News Network staff, Brooklyn Tech broadcast journalism, Brooklyn Tech student newsroom, The Survey, ${staff.map(member => member.full_name).filter(Boolean).join(', ')}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About TNN',
      description: "About Tech News Network, Brooklyn Tech's student-run broadcast journalism outlet associated with The Survey.",
      url: `${window.location.origin}/about/`,
      mainEntity: {
        '@type': 'NewsMediaOrganization',
        name: 'Tech News Network',
        alternateName: 'TNN',
        sameAs: OFFICIAL_LINKS.filter(link => link.href.startsWith('http')).map(link => link.href),
        member: staff.map(member => ({
          '@type': 'Person',
          name: member.full_name,
          jobTitle: publicTitle(member),
          description: member.public_description || undefined,
          image: member.public_headshot_url || undefined,
          url: `${window.location.origin}${staffPath(member)}`,
        })),
      },
    },
  })

  useEffect(() => {
    async function loadStaff() {
      setStaffLoading(true)
      let publicResult = await supabase
        .from('public_profiles')
        .select('*')
        .order('public_order')
        .order('full_name')
      const videoResult = await supabase
        .from('videos')
        .select('*')
        .eq('published', true)

      if (publicResult.error && publicResult.error.message?.includes('public_order')) {
        publicResult = await supabase
          .from('public_profiles')
          .select('*')
          .order('full_name')
      }

      const profileMap = new Map((publicResult.data || [])
        .filter(profile => profile.id && profile.full_name && profile.public_visible !== false)
        .map(profile => [profile.id, profile]))

      const videosWithCredits = await attachCreators(videoResult.data || [])
      setPublishedVideoCount((videoResult.data || []).length)
      videosWithCredits.forEach(video => {
        visibleCredits(video).forEach(credit => {
          if (!credit.profile_id || !credit.name || profileMap.has(credit.profile_id)) return
          profileMap.set(credit.profile_id, {
            id: credit.profile_id,
            full_name: credit.name,
            role: credit.role || 'member',
            public_role: 'member',
            public_title: credit.role || '',
            public_description: '',
            public_headshot_url: '',
          })
        })
      })

      setStaff([...profileMap.values()].sort(sortStaff))
      setStaffLoading(false)
    }

    loadStaff()
  }, [])

  const groupedStaff = useMemo(() => ({
    exec: staff.filter(member => publicRole(member) === 'exec').sort(sortStaff),
    associate: staff.filter(member => publicRole(member) === 'associate').sort(sortStaff),
    member: staff.filter(member => publicRole(member) === 'member').sort(sortStaff),
  }), [staff])

  return (
    <PublicLayout>
      <main className="info-page">
        <section className="info-hero">
          <div className="info-hero-copy">
            <span>About TNN</span>
            <h1>Tech News Network</h1>
            <p>TNN is Brooklyn Tech's student-run broadcast newsroom.</p>
            <div className="info-hero-actions">
              <Link to="/videos/">View published stories <ArrowRight size={14} /></Link>
            </div>
          </div>
          <aside className="info-hero-edition" aria-label="About Tech News Network">
            <span>Brooklyn Technical High School</span>
            <strong>Student-run broadcast journalism</strong>
            <p>Students pitch, report, film, edit, and publish TNN's coverage.</p>
          </aside>
        </section>

        <section className="info-intro" aria-label="Our newsroom">
          <div className="info-intro-lead">
            <p>
              TNN publishes video reporting about Brooklyn Tech. Student journalists produce
              each story from the first pitch through final publication.
            </p>
          </div>
          <div className="info-official-links" aria-label="Official TNN links">
            {OFFICIAL_LINKS.map(({ label, href, icon: Icon }) => (
              <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>
                <Icon size={15} />
                {label}
                <ArrowRight size={13} />
              </a>
            ))}
          </div>
        </section>

        <section className="info-partners" aria-labelledby="info-partners-title">
          <h2 id="info-partners-title">Partnered with</h2>
          <div className="info-partner-grid">
            {PARTNERS.map(partner => (
              <a
                key={partner.name}
                className={`info-partner-link info-partner-${partner.className}`}
                href={partner.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visit ${partner.name}`}
              >
                <img src={partner.logo} alt={partner.name} loading="lazy" decoding="async" />
              </a>
            ))}
          </div>
        </section>

        <section className="info-snapshot" aria-label="Newsroom snapshot">
          <article>
            <strong>{staffLoading ? '...' : staff.length}</strong>
            <span>student journalists</span>
          </article>
          <article>
            <strong>100K+</strong>
            <span>people reached by our work</span>
          </article>
          <article>
            <strong>{publishedVideoCount}</strong>
            <span>published stories</span>
          </article>
        </section>

        <section className="info-directory-intro">
          <h2>TNN staff</h2>
          <div>
            <p>Executives, junior executives, and members manage TNN's reporting and production.</p>
            <a href={JOIN_URL} target="_blank" rel="noopener noreferrer">
              Apply to join TNN <ArrowRight size={14} />
            </a>
          </div>
        </section>

        {staffLoading ? (
          <section className="info-staff-loading" aria-label="Loading staff profiles">
            <span />
            <span />
            <span />
          </section>
        ) : staff.length ? (
          <>
            <StaffGroup title="Executives" role="exec" members={groupedStaff.exec} />
            <StaffGroup title="Junior Executives" role="associate" members={groupedStaff.associate} />
            <StaffGroup title="Members" role="member" members={groupedStaff.member} />
          </>
        ) : (
          <section className="info-staff-loading">
            Staff profiles will appear here once public profiles are available.
          </section>
        )}

        <section className="info-cta">
          <div>
            <h2>Contact TNN</h2>
            <p>Send a news tip, pitch a segment, or apply to join the newsroom.</p>
          </div>
          <div className="info-cta-actions">
            <a href="mailto:bthstnn@gmail.com">
              Pitch a story <Mail size={15} />
            </a>
            <a href={JOIN_URL} target="_blank" rel="noopener noreferrer">
              Join TNN <ArrowRight size={15} />
            </a>
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}
