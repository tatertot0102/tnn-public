import {createHash,timingSafeEqual} from 'node:crypto'
const TABLES=new Set(['videos','profiles','video_corrections','site_settings','partners','press_mentions','slug_redirects'])
const reply=(status,error)=>Response.json(error?{error}:{ok:true,tag:'tnn-content'},{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}})
export function createRevalidationHandler({secret,invalidate}) {
  return async request=>{
    if(request.method!=='POST')return reply(405,'POST required')
    if(!secret||secret.length<32)return reply(503,'Revalidation is not configured')
    const value=/^Bearer ([^\s]+)$/.exec(request.headers.get('authorization')||'')?.[1]||''
    const digest=s=>createHash('sha256').update(s).digest()
    if(!value||!timingSafeEqual(digest(value),digest(secret)))return reply(401,'Unauthorized')
    if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return reply(415,'JSON required')
    let length=0,text='';const reader=request.body?.getReader();if(!reader)return reply(400,'Invalid event')
    const decoder=new TextDecoder()
    while(true){const{done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>65536){await reader.cancel();return reply(413,'Event too large')}text+=decoder.decode(value,{stream:true})}
    text+=decoder.decode();let body;try{body=JSON.parse(text)}catch{return reply(400,'Invalid event')}
    if(!body||body.schema!=='public'||!TABLES.has(body.table)||!['INSERT','UPDATE','DELETE'].includes(body.type))return reply(400,'Unsupported event')
    try{await invalidate('tnn-content');return reply(200)}catch{return reply(503,'Revalidation is temporarily unavailable')}
  }
}
