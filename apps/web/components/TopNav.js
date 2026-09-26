'use client';

import AuthNav from './AuthNav';

export default function TopNav() {
  return (
    <header className="site-nav">
      <div className="site-nav__inner">
        <a href='/' className="site-nav__brand" aria-label="GoDyrect home">
          <img className="site-nav__logo" src='/godyrect-logo-transparent.png' alt='GoDyrect' />
        </a>
        <AuthNav />
      </div>
    </header>
  );
}
