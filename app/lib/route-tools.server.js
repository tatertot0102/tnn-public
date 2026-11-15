import {redirect} from 'react-router'
import {publicData,publicHeaders} from './data.server'
import {SECTIONS,newestFirst,staffPath,legacyStoryPath} from './model.mjs'
export async function pageLoader(kind,{request,params={}}) {
  const data=await publicData(),url=new URL(request.url);let extra={}
  if(kind==='videos'){
    let section=params.section||url.searchParams.get('section')||'';if(section==='catalog')throw redirect('/videos/',301)
    if(section&&!SECTIONS.some(s=>s.slug===section))throw new Response('Not found',{status:404})
    const q=(url.searchParams.get('q')||'').trim(),sort=['oldest','title'].includes(url.searchParams.get('sort'))?url.searchParams.get('sort'):'newest'
    let query=data.videos.filter(v=>(!section||v.section===section)&&(!q||[v.title,v.summary,v.dek,...v.credits.map(c=>c.name)].join(' ').toLowerCase().includes(q.toLowerCase())))
    query.sort(sort==='oldest'?(a,b)=>newestFirst(b,a):sort==='title'?(a,b)=>a.title.localeCompare(b.title):newestFirst);extra={query,section,sort,q}
  }
  if(kind==='story') {const video=data.videos.find(v=>v.id===params.id);if(!video)throw new Response('Not found',{status:404});extra={video}}
  if(kind==='staff') {const person=data.profiles.find(p=>staffPath(p).split('/')[2]===params.slug||p.id===params.slug);if(!person)throw new Response('Not found',{status:404});if(person.id===params.slug)throw redirect(staffPath(person),301);extra={person}}
  return Response.json({kind,data,...extra},{headers:publicHeaders()})
}
export const publicRouteHeaders=({loaderHeaders})=>Object.fromEntries(loaderHeaders)
