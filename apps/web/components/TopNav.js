'use client';

import AuthNav from './AuthNav';
import { usePathname } from 'next/navigation';

export default function TopNav() {
  const pathname = usePathname();
  const isLanding = ['/about', '/contactus'].includes(pathname);

  return (
    <header className="site-nav">
      <div className="site-nav__inner">
        <a href='/' className="site-nav__brand" aria-label="GoDyrect home">
          <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12h12M13 7l5 5-5 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
          <span className="brand-word">Go<span>Dyrect</span></span>
        </a>
        {isLanding ? (
          <nav className="site-nav__links" aria-label="Main navigation">
            <a href='/explore' className="site-nav__link">Explore</a>
            <a href='/about' className="site-nav__link">About</a>
            <a href='/contactus' className="site-nav__link">Contact</a>
            <a href='/login' className="site-nav__link">Sign in</a>
            <a href='/signup' className="site-nav__cta">Join GoDyrect</a>
          </nav>
        ) : (
          <AuthNav />
        )}
      </div>
    </header>
  );
}
