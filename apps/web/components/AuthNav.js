'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';

const memberLinks = [['/explore','Discover'],['/feed','Following'],['/messages','Messages'],['/dashboard','Workspace']];

export default function AuthNav() {
  const pathname = usePathname();
  const [user,setUser] = useState(null);
  const [loading,setLoading] = useState(true);
  const [menuOpen,setMenuOpen] = useState(false);
  const [isNativeApp,setIsNativeApp] = useState(false);

  useEffect(() => {
    setIsNativeApp(Boolean(window.GoDyrectNative));
    let mounted = true;
    supabase?.auth.getUser().then(({data}) => { if (mounted) { setUser(data?.user || null); setLoading(false); } });
    if (!supabase) setLoading(false);
    const { data } = supabase?.auth.onAuthStateChange((_event,session) => { setUser(session?.user || null); setLoading(false); }) || {};
    return () => { mounted = false; data?.subscription?.unsubscribe(); };
  },[]);

  async function signOut() { await supabase?.auth.signOut(); window.location.href = '/explore'; }
  function openNotificationPreferences() { window.GoDyrectNative?.request?.('notificationPreferences'); }
  const links = user ? memberLinks : [['/explore','Discover'],['/about','How it works']];
  const isCurrent = (href) => {
    if (href === '/explore') return pathname === '/' || pathname?.startsWith('/explore');
    if (href === '/dashboard') return ['/dashboard', '/businesses', '/listings', '/favorites'].some((path) => pathname?.startsWith(path));
    return pathname === href || pathname?.startsWith(`${href}/`);
  };
  const accountCurrent = pathname?.startsWith('/profile') || pathname?.startsWith('/settings');

  return (
    <nav className={`auth-nav ${user ? 'is-signed-in' : ''}`} aria-label="Account navigation">
      {!loading && links.map(([href,label]) => <a className={`nav-link ${isCurrent(href) ? 'is-active' : ''}`} href={href} aria-current={isCurrent(href) ? 'page' : undefined} key={href}>{label}</a>)}
      {!loading && (user ? <a className="nav-primary" href="/listings/new">List a business</a> : <><a className="nav-link" href="/login">Sign in</a><a className="nav-primary" href="/signup">Get started</a></>)}
      {!loading && user && isNativeApp ? <button className="nav-notifications" onClick={openNotificationPreferences} aria-label="Notification preferences">🔔</button> : null}
      <div className="nav-menu">
        <button className={`nav-menu__button ${accountCurrent ? 'is-active' : ''}`} aria-label="Open account navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}>{user ? <span className="nav-menu__avatar">{(user.user_metadata?.full_name || user.email || '?').trim().charAt(0).toUpperCase()}</span> : '≡'}</button>
        {menuOpen ? <div className="nav-menu__panel">
          {links.map(([href,label]) => <a className={isCurrent(href) ? 'is-active' : ''} href={href} key={href}>{label}</a>)}
          {user ? <><a className={pathname?.startsWith('/favorites') ? 'is-active' : ''} href="/favorites">Saved</a><a className={pathname?.startsWith('/profile') ? 'is-active' : ''} href="/profile">Profile</a><a className={pathname?.startsWith('/settings') ? 'is-active' : ''} href="/settings">Settings & privacy</a><a href="/listings/new">List a business</a><button onClick={signOut}>Sign out</button></> : <><a href="/login">Sign in</a><a href="/signup">Get started</a></>}
        </div> : null}
      </div>
    </nav>
  );
}
