import { useEffect } from 'react'

function upsertMeta(selector, attrs) {
  let tag = document.head.querySelector(selector)
  if (!tag) {
    tag = document.createElement('meta')
    document.head.appendChild(tag)
  }
  Object.entries(attrs).forEach(([key, value]) => tag.setAttribute(key, value))
  return tag
}

function upsertLink(rel, href) {
  let tag = document.head.querySelector(`link[rel="${rel}"]`)
  if (!tag) {
    tag = document.createElement('link')
    tag.setAttribute('rel', rel)
    document.head.appendChild(tag)
  }
  tag.setAttribute('href', href)
  return tag
}

export function useSeoMeta({
  title,
  description,
  path,
  image,
  type = 'profile',
  noindex = false,
  jsonLd,
}) {
  useEffect(() => {
    const origin = window.location.origin
    const canonical = `${origin}${path || window.location.pathname}`
    const pageTitle = title || 'TNN'
    const pageDescription = description || "Tech News Network, Brooklyn Tech's student-run video newsroom."

    document.title = pageTitle
    upsertMeta('meta[name="description"]', { name: 'description', content: pageDescription })
    upsertMeta('meta[name="robots"]', { name: 'robots', content: noindex ? 'noindex,nofollow' : 'index,follow' })
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: pageTitle })
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: pageDescription })
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type })
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical })
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' })
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: pageTitle })
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: pageDescription })
    if (image) {
      upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image })
      upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image })
    }
    upsertLink('canonical', canonical)

    const oldJsonLd = document.head.querySelector('script[data-page-json-ld="true"]')
    if (oldJsonLd) oldJsonLd.remove()
    if (jsonLd) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.pageJsonLd = 'true'
      script.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }
  }, [title, description, path, image, type, noindex, jsonLd])
}
