import {AuthProvider,LoginPage} from '../../src/recovered/live-module'
import '../../src/styles/global.css'
import {privateHeaders} from '../lib/data.server'
export const loader=()=>Response.json({},{headers:privateHeaders()})
export const headers=({loaderHeaders})=>Object.fromEntries(loaderHeaders)
export const meta=()=>[{title:'Staff sign in | Tech News Network'},{name:'robots',content:'noindex,nofollow'}]
export default function Login(){return <AuthProvider><LoginPage/></AuthProvider>}
