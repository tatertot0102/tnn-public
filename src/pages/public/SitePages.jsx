import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PublicLayout } from '../../recovered/live-module'
import { useSeoMeta } from '../../lib/seo'
import { JOIN_FORM_URL, PRESS_MENTIONS } from '../../lib/site'

const SITE_URL = 'https://bthstnn.org'

function formatPressDate(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function JoinPage() {
  useSeoMeta({
    title: 'Join TNN | Tech News Network (TNN) — Brooklyn Tech',
    description: "How Brooklyn Tech students can join Tech News Network, the school's student-run video newsroom.",
    path: '/join/',
    type: 'website',
  })
  return (
    <PublicLayout>
      <main className="site-page">
        <header className="site-page-head">
          <span>Join TNN</span>
          <h1>Report, film, and edit for Brooklyn Tech's video newsroom.</h1>
          <p>
            Tech News Network is run by students. Students pitch, report, film, edit, and publish
            TNN's coverage, from the first pitch through final publication.
          </p>
        </header>
        <section className="site-page-body" aria-labelledby="join-roles">
          <h2 id="join-roles">Where you could fit</h2>
          <ul className="join-roles">
            <li><strong>Pre-production</strong> Pitches, research, scripts, scheduling.</li>
            <li><strong>Production</strong> Anchoring, interviews, camera work, directing.</li>
            <li><strong>Post-production</strong> Editing, graphics, audio, publishing.</li>
          </ul>
          <p>
            Fill out the interest form and TNN's executives will follow up with next steps.
          </p>
          <a className="site-page-button" href={JOIN_FORM_URL} target="_blank" rel="noopener noreferrer">
            Open the TNN interest form <ExternalLink size={15} aria-hidden="true" />
          </a>
          <p className="site-page-note">
            Questions? Email <a href="mailto:bthstnn@gmail.com">bthstnn@gmail.com</a> or read more <Link to="/about/">about TNN</Link>.
          </p>
        </section>
      </main>
    </PublicLayout>
  )
}

export function PressPage() {
  useSeoMeta({
    title: 'TNN in the News | Tech News Network (TNN) — Brooklyn Tech',
    description: "News coverage that has cited or embedded Tech News Network's reporting.",
    path: '/press/',
    type: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'TNN in the News',
      url: `${SITE_URL}/press/`,
      hasPart: PRESS_MENTIONS.map(item => ({
        '@type': 'NewsArticle',
        headline: item.title,
        url: item.url,
        datePublished: item.date,
        author: { '@type': 'Person', name: item.author },
        publisher: { '@type': 'NewsMediaOrganization', name: item.outlet },
      })),
    },
  })
  return (
    <PublicLayout>
      <main className="site-page">
        <header className="site-page-head">
          <span>Press</span>
          <h1>TNN in the news</h1>
          <p>Coverage from other outlets that has cited or embedded Tech News Network's reporting.</p>
        </header>
        <ol className="press-list">
          {PRESS_MENTIONS.map(item => (
            <li key={item.url}>
              <span className="press-outlet">{item.outlet}</span>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <strong>{item.title}</strong> <ExternalLink size={14} aria-hidden="true" />
              </a>
              <span className="press-meta">
                {item.author} · <time dateTime={item.date}>{formatPressDate(item.date)}</time>
              </span>
              {item.note && <p>{item.note}</p>}
            </li>
          ))}
        </ol>
      </main>
    </PublicLayout>
  )
}
