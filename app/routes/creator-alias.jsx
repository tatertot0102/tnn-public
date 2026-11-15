import {redirect} from 'react-router'
import {publicData} from '../lib/data.server'
import {staffPath} from '../lib/model.mjs'
export async function loader({params}) {const data=await publicData();const p=data.profiles.find(p=>p.id===params.slug||staffPath(p).split('/')[2]===params.slug);if(!p)throw new Response('Not found',{status:404});throw redirect(staffPath(p),301)}
