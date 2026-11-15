export const SITE_URL = 'https://bthstnn.org'
export const SECTIONS = [
  {slug:'breaking',label:'Breaking'}, {slug:'hardnews',label:'Hard News'},
  {slug:'features',label:'Features'}, {slug:'docs',label:'Docs'},
  {slug:'sports',label:'Sports'}, {slug:'weather',label:'Weather'},
  {slug:'opinion',label:'Opinion'}, {slug:'promo',label:'Promo',primary:false},
]
export const PARTNERS = [
  {name:'Columbia University Graduate School of Journalism',url:'https://journalism.columbia.edu/',logo_url:'/partners/columbia-journalism.png'},
  {name:"The Survey, Brooklyn Tech's student newspaper",url:'https://surveybths.com/',logo_url:'/partners/the-survey.png'},
]
export const JOIN_URL='https://docs.google.com/forms/d/e/1FAIpQLSdRQMvmPiVj1bT_l-Nh0IaplpyygUQgfHKp90AErUf2gKIqcQ/viewform?usp=header'
export const SUPPLIED_PRESS=[{id:'daily-news-2026-11-14',outlet:'New York Daily News',author:'Cayla Bamberger',published_on:'2026-11-14',title:'NYC specialized high schools admissions test plagued by technical issues',url:'https://www.nydailynews.com/2026/11/14/nyc-specialized-high-schools-admissions-test-technical-issues/'}]
export function slugify(value='') { return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’'\"]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80) }
export function safeUrl(value) { try {const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null} }
export function asArray(value) {if(Array.isArray(value))return value;if(typeof value==='string'){try{const x=JSON.parse(value);return Array.isArray(x)?x:[]}catch{}}return []}
export function asObject(value) {if(value&&typeof value==='object'&&!Array.isArray(value))return value;if(typeof value==='string'){try{return asObject(JSON.parse(value))}catch{}}return {}}
export function publicationDate(video) {
  if(video.published_at&&Number.isFinite(Date.parse(video.published_at)))return new Date(video.published_at).toISOString()
  const raw=String(video.date||'').trim(); if(/^\d{4}-\d{2}-\d{2}$/.test(raw)&&Number.isFinite(Date.parse(raw)))return raw
  const m=raw.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i)
  if(!m)return null
  const month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[1].slice(0,3).toLowerCase());if(month<0)return null
  const d=new Date(Date.UTC(Number(m[3]),month,Number(m[2])));if(d.getUTCMonth()!==month||d.getUTCDate()!==Number(m[2]))return null
  return d.toISOString().slice(0,10)
}
export function storyDateParts(video) {const d=publicationDate(video)||(Number.isFinite(Date.parse(video.created_at))?video.created_at:null);return d?{year:d.slice(0,4),month:d.slice(5,7)}:null}
export function storyPath(video) {const d=storyDateParts(video);return d?`/stories/${d.year}/${d.month}/${video.slug||slugify(video.title)||video.id}/`:`/videos/story/${video.id}/${slugify(video.title)}/`}
export function legacyStoryPath(video) {return `/videos/story/${video.id}/${slugify(video.title)}/`}
export function staffPath(profile) {return `/staff/${profile.public_slug||slugify(profile.full_name)||profile.id}/`}
export function isPublic(video,now=Date.now()) {const status=video.publish_status||(video.published?'published':'draft');return video.published===true&&['published','scheduled'].includes(status)&&(!video.scheduled_at||(Number.isFinite(Date.parse(video.scheduled_at))&&Date.parse(video.scheduled_at)<=now))}
export function normalizeVideos(rows,profiles,now=Date.now()) {
  const byId=new Map(profiles.map(p=>[p.id,p]));const list=rows.filter(v=>isPublic(v,now));const counts=new Map()
  for(const v of list){const slug=v.slug||slugify(v.title)||v.id;counts.set(slug,(counts.get(slug)||0)+1)}
  return list.map(v=>{
    const slug=v.slug||slugify(v.title)||v.id;const credits=asArray(v.credits).filter(c=>c&&c.show!==false&&(c.name||byId.has(c.profile_id))).map(c=>({profile_id:c.profile_id||null,name:c.name||byId.get(c.profile_id)?.full_name||'',roles:asArray(c.roles).length?asArray(c.roles):c.role?[c.role]:[],profile:byId.get(c.profile_id)||null}))
    const data={};for(const key of ['id','title','section','href','thumbnail','thumbnail_alt','dek','summary','body','transcript','runtime','date','published_at','public_updated_at','created_at','updated_at','display_order','published','publish_status','scheduled_at','orientation','editor_note','breaking_until','video_file_url','captions_url','hero_variant','byline'])if(v[key]!=null)data[key]=v[key]
    return {...data,slug:counts.get(slug)>1&&!v.slug?`${slug}-${v.id.slice(0,8)}`:slug,placements:[...new Set([...asArray(v.placements),v.placement].filter(Boolean))],credits}
  }).sort((a,b)=>(Number(a.display_order)||0)-(Number(b.display_order)||0)||Date.parse(b.created_at)-Date.parse(a.created_at))
}
export function newestFirst(a,b) {return Date.parse(publicationDate(b)||b.created_at||0)-Date.parse(publicationDate(a)||a.created_at||0)}
export function sectionLabel(slug) {return SECTIONS.find(s=>s.slug===slug)?.label||slug||'Video'}
export function formatDate(value,{time=false}={}) {if(!value||!Number.isFinite(Date.parse(value)))return null;return new Intl.DateTimeFormat('en-US',{year:'numeric',month:'long',day:'numeric',...(time?{hour:'numeric',minute:'2-digit',timeZoneName:'short'}:{}),timeZone:value.length===10?'UTC':'America/New_York'}).format(new Date(value))}
export function runtimeISO(value) {if(!value)return undefined;if(/^PT[\dHMS.]+$/i.test(value))return value.toUpperCase();const p=String(value).split(':').map(Number);if(p.length>3||p.some(x=>!Number.isFinite(x)||x<0))return undefined;const s=p.pop()||0,m=p.pop()||0,h=p.pop()||0;return `PT${h?`${h}H`:''}${m?`${m}M`:''}${s?`${s}S`:''}`==='PT'?undefined:`PT${h?`${h}H`:''}${m?`${m}M`:''}${s?`${s}S`:''}`}
export function platform(video) {const u=safeUrl(video.href);if(!u)return 'Video';const host=new URL(u).hostname.replace(/^www\./,'');return host==='youtu.be'||host==='youtube.com'?'YouTube':host==='instagram.com'?'Instagram':'Video'}
export function embedUrl(video) {const u=safeUrl(video.href);if(!u)return null;const parsed=new URL(u),host=parsed.hostname.replace(/^www\./,'');if(['youtube.com','youtu.be'].includes(host)){const id=host==='youtu.be'?parsed.pathname.split('/')[1]:parsed.searchParams.get('v')||parsed.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)/)?.[1];return /^[\w-]{11}$/.test(id||'')?`https://www.youtube.com/embed/${id}`:null}if(host==='instagram.com'){const m=parsed.pathname.match(/^\/(reel|p|tv)\/([\w-]+)\/?$/);return m?`https://www.instagram.com/${m[1]}/${m[2]}/embed/`:null}return null}
export function shareDate(video) {return video.public_updated_at||publicationDate(video)}
