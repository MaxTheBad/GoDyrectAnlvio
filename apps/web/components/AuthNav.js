'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const memberLinks = [['/explore','Discover'],['/feed','Following'],['/messages','Messages'],['/dashboard','Workspace']];

export default function AuthNav() {
  const [user,setUser] = useState(null);
  const [loading,setLoading] = useState(true);
  const [menuOpen,setMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase?.auth.getUser().then(({data}) => { if (mounted) { setUser(data?.user || null); setLoading(false); } });
    if (!supabase) setLoading(false);
    const { data } = supabase?.auth.onAuthStateChange((_event,session) => { setUser(session?.user || null); setLoading(false); }) || {};
    return () => { mounted = false; data?.subscription?.unsubscribe(); };
  },[]);

  async function signOut() { await supabase?.auth.signOut(); window.location.href = '/explore'; }
  const links = user ? memberLinks : [['/explore','Discover'],['/about','How it works']];

  return (
    <nav className="auth-nav" aria-label="Account navigation">
      {!loading && links.map(([href,label]) => <a className="nav-link" href={href} key={href}>{label}</a>)}
      {!loading && (user ? <a className="nav-primary" href="/listings/new">List a business</a> : <><a className="nav-link" href="/login">Sign in</a><a className="nav-primary" href="/signup">Get started</a></>)}
      <div className="nav-menu">
        <button className="nav-menu__button" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}>≡</button>
        {menuOpen ? <div className="nav-menu__panel">
          {links.map(([href,label]) => <a href={href} key={href}>{label}</a>)}
          {user ? <><a href="/favorites">Saved</a><a href="/profile">Profile</a><a href="/listings/new">List a business</a><button onClick={signOut}>Sign out</button></> : <><a href="/login">Sign in</a><a href="/signup">Get started</a></>}
        </div> : null}
      </div>
    </nav>
  );
}
