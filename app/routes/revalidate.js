import {invalidateByTag} from '@vercel/functions'
import {createRevalidationHandler} from '../lib/revalidation.server'
export const action=({request})=>createRevalidationHandler({secret:process.env.TNN_REVALIDATE_SECRET,invalidate:invalidateByTag})(request)
export const loader=()=>Response.json({error:'POST required'},{status:405,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}})
