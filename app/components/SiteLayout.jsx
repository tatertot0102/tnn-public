import {useEffect,useRef,useState} from 'react'
import {Link,useLocation} from 'react-router'
import {Menu,X,Youtube} from 'lucide-react'
import {SECTIONS} from '../lib/model.mjs'
export function SiteLayout({children,data={}}) {
  const [open,setOpen]=useState(false),button=useRef(null),panel=useRef(null);const location=useLocation()
  useEffect(()=>{setOpen(false)},[location.pathname,location.search])
  useEffect(()=>{
    if(!open)return
    const previous=document.activeElement;panel.current?.querySelector('button,a')?.focus()
    function key(event){if(event.key==='Escape'){setOpen(false);return}if(event.key!=='Tab')return;const list=[...panel.current.querySelectorAll('a[href],button:not([disabled])')];const first=list[0],last=list.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}
    document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);if(previous===button.current||panel.current?.contains(document.activeElement))button.current?.focus()}
  },[open])
  const sections=SECTIONS.filter(s=>s.primary!==false)
  return <div className="tnn-site"><a className="tnn-skip" href="#main">Skip to content</a>
    <header className="tnn-header"><div className="tnn-utility"><span>Tech News Network</span><Link to="/login/">Staff sign in</Link></div>
      <div className="tnn-masthead"><Link className="tnn-brand" to="/" aria-label="Tech News Network home"><img src="/assets/Horizontal-BfFo7lqE.png" width="270" height="74" alt="Tech News Network"/></Link>
        <nav className="tnn-primary" aria-label="Main"><Link to="/videos/">Videos</Link><Link to="/about/">About</Link><Link to="/join/">Join</Link></nav>
        <a className="tnn-subscribe" href="https://www.youtube.com/@tnn_bths" target="_blank" rel="noopener noreferrer"><Youtube size={17} aria-hidden="true"/><span>Subscribe</span></a>
        <button ref={button} className="tnn-menu-button" type="button" aria-label="Open menu" aria-expanded={open} aria-controls="tnn-mobile-menu" onClick={()=>setOpen(v=>!v)}><Menu aria-hidden="true"/></button></div>
      <nav className="tnn-sections" aria-label="News sections"><Link to="/videos/">All videos</Link>{sections.map(s=><Link key={s.slug} to={`/videos/${s.slug}/`}>{s.label}</Link>)}</nav>
      {open&&<nav ref={panel} id="tnn-mobile-menu" className="tnn-mobile-menu" aria-label="Mobile menu"><button type="button" onClick={()=>setOpen(false)} aria-label="Close menu"><X aria-hidden="true"/></button><Link to="/videos/">All videos</Link><Link to="/about/">About</Link><Link to="/join/">Join TNN</Link>{sections.map(s=><Link key={s.slug} to={`/videos/${s.slug}/`}>{s.label}</Link>)}</nav>}
    </header>{children}<footer className="tnn-footer"><Link to="/" aria-label="Tech News Network home"><img src="/tnn-logo.png" width="90" height="90" alt=""/></Link><p>Tech News Network, Brooklyn Technical High School</p><nav aria-label="Footer"><Link to="/videos/">All videos</Link><Link to="/about/#staff">Staff</Link><Link to="/about/">About</Link><Link to="/join/">Join</Link><a href="/rss.xml">RSS</a></nav><small>© {new Date(data.now||Date.now()).getFullYear()} Tech News Network.</small></footer>
  </div>
}
