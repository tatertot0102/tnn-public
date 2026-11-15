import {Link} from 'react-router'
export const loader=()=>{throw new Response('Not found',{status:404})}
export default function NotFound(){return <main id="main" className="tnn-main"><h1>Page not found</h1><Link to="/">Return home</Link></main>}
