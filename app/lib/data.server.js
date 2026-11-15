import {normalizeVideos,asObject,PARTNERS,SUPPLIED_PRESS} from './model.mjs'
function config() {return {url:process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||import.meta.env.VITE_SUPABASE_URL,key:process.env.SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_ANON_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY}}
export async function rows(table,query='',{optional=false}={}) {
  const {url,key}=config();if(!url||!key)throw new Response('Content configuration is unavailable',{status:503})
  const response=await fetch(`${url.replace(/\/$/,'')}/rest/v1/${table}?select=*&${query}`,{headers:{apikey:key},signal:AbortSignal.timeout(15000)})
  if(!response.ok){const error=await response.json().catch(()=>({}));if(optional&&['PGRST205','42P01'].includes(error.code))return null;console.error('Public content read failed',{table,status:response.status,code:error.code});throw new Response('The newsroom is temporarily unavailable. Please try again.',{status:503})}
  const data=await response.json();return Array.isArray(data)?data:[]
}
async function loadPublicData() {
  const now=new Date().toISOString()
  const [rawProfiles,view,settings,partners,press,corrections,redirects]=await Promise.all([
    rows('public_profiles'),rows('public_stories','order=display_order.asc,created_at.desc',{optional:true}),rows('site_settings','id=eq.public',{optional:true}),rows('partners','order=display_order.asc',{optional:true}),rows('press_mentions','order=published_on.desc',{optional:true}),rows('video_corrections','public=eq.true&order=occurred_at.desc',{optional:true}),rows('slug_redirects','',{optional:true}),
  ])
  const profiles=(rawProfiles||[]).filter(p=>p.public_visible!==false).map(p=>({id:p.id,full_name:p.full_name,public_slug:p.public_slug,public_role:p.public_role||(['exec','admin'].includes(p.role)?'exec':'member'),public_title:p.public_title,public_description:p.public_description,public_headshot_url:p.public_headshot_url,public_socials:asObject(p.public_socials),public_visible:true,public_order:p.public_order}))
  const videos=normalizeVideos(view??await rows('videos','published=eq.true&order=display_order.asc,created_at.desc'),profiles,Date.parse(now))
  const visibleIds=new Set(videos.map(v=>v.id))
  return {now,videos,profiles,settings:asObject(settings?.[0]?.settings),partners:partners?.length?partners.filter(p=>p.active!==false):PARTNERS,press:press?.length?press:SUPPLIED_PRESS,corrections:(corrections||[]).filter(c=>visibleIds.has(c.video_id)),redirects:redirects||[],standardsPublished:process.env.STANDARDS_PUBLISHED==='true',analyticsEnabled:process.env.TNN_ENABLE_ANALYTICS==='true'}
}
export const publicHeaders=()=>({'Cache-Control':'public, max-age=0, s-maxage=300, stale-while-revalidate=0','Vercel-Cache-Tag':'tnn-content'})
export const privateHeaders=()=>({'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'})

let inFlight=null
export function publicData(){if(!inFlight)inFlight=loadPublicData().finally(()=>{inFlight=null});return inFlight}
