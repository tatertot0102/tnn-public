import {useLocation,Navigate} from 'react-router'
import {AuthProvider,ProtectedRoute,DashboardPage,VideoCMSPage} from '../../src/recovered/live-module'
import TeamPage from '../../src/pages/newsroom/TeamPage'
import '../../src/styles/global.css'
import {privateHeaders} from '../lib/data.server'
export const loader=()=>Response.json({},{headers:privateHeaders()})
export const headers=({loaderHeaders})=>Object.fromEntries(loaderHeaders)
export const meta=()=>[{title:'Public CMS | Tech News Network'},{name:'robots',content:'noindex,nofollow'}]
export default function Newsroom(){const path=useLocation().pathname.replace(/^\/cms/,'/newsroom').replace(/\/$/,'');const Page=path==='/newsroom/videos'?VideoCMSPage:path==='/newsroom/team'?TeamPage:path==='/newsroom'?DashboardPage:null;return <AuthProvider><ProtectedRoute>{Page?<Page/>:<Navigate to="/newsroom/" replace/>}</ProtectedRoute></AuthProvider>}
