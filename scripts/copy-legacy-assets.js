const fs = require('node:fs/promises')
const path = require('node:path')

const DIST_DIR = path.join(process.cwd(), 'dist')
const ASSETS_DIR = path.join(process.cwd(), 'dist', 'assets')
const LEGACY_JS = ['index-CYOvmjPi.js']
const LEGACY_CSS = ['index-Dd1J4IQ3.css']
const STATIC_ROUTES = [
  '/about',
  '/videos',
  '/videos/hardnews',
  '/videos/features',
  '/videos/breaking',
  '/videos/docs',
  '/videos/opinion',
  '/videos/sports',
  '/login',
]

async function newestAsset(extension) {
  const files = await fs.readdir(ASSETS_DIR)
  const matches = files
    .filter(file => file.startsWith('index-') && file.endsWith(extension))
    .sort()
  return matches.at(-1)
}

async function copyAliases(source, aliases) {
  if (!source) return
  await Promise.all(aliases.map(alias => (
    fs.copyFile(path.join(ASSETS_DIR, source), path.join(ASSETS_DIR, alias))
  )))
}

function routesFromSitemap(xml = '') {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map(match => {
      try {
        return new URL(match[1]).pathname
      } catch {
        return ''
      }
    })
    .filter(route => route && route !== '/')
}

function cleanRoute(route) {
  return String(route || '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
}

async function copyRouteIndexes() {
  const indexPath = path.join(DIST_DIR, 'index.html')
  const sitemapPath = path.join(DIST_DIR, 'sitemap.xml')
  const indexHtml = await fs.readFile(indexPath, 'utf8')
  const sitemapXml = await fs.readFile(sitemapPath, 'utf8').catch(() => '')
  const routes = [...new Set([...STATIC_ROUTES, ...routesFromSitemap(sitemapXml)])]
    .map(cleanRoute)
    .filter(Boolean)

  await Promise.all(routes.map(async route => {
    const routeDir = path.join(DIST_DIR, route)
    await fs.mkdir(routeDir, { recursive: true })
    await fs.writeFile(path.join(routeDir, 'index.html'), indexHtml)
  }))

  console.log(`[routes] Added static index files for ${routes.length} clean URLs`)
}

async function main() {
  const js = await newestAsset('.js')
  const css = await newestAsset('.css')
  await copyAliases(js, LEGACY_JS)
  await copyAliases(css, LEGACY_CSS)
  console.log(`[assets] Added legacy aliases for cached HTML: ${[...LEGACY_JS, ...LEGACY_CSS].join(', ')}`)
  await copyRouteIndexes()
}

main().catch(error => {
  console.warn(`[assets] Could not add legacy asset aliases: ${error.message}`)
})
