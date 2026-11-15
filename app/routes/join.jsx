import {useLoaderData} from 'react-router'
import {Join} from '../components/SitePages'
import {pageLoader,publicRouteHeaders} from '../lib/route-tools.server'
export {basicMeta as meta} from '../lib/meta.mjs'
export const loader=args=>pageLoader('join',args)
export const headers=publicRouteHeaders
export default function Route() {return <Join {...useLoaderData()}/>}
