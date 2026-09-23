'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function BottomNav() {
  const [isMobile, setIsMobile] = useState(false);
  const [userId, setUserId] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    async function loadUser() {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id || '');
    }
    loadUser();
    if (!supabase) return;
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || '');
    });
    return () => subscription?.subscription?.unsubscribe();
  }, []);

  if (!isMobile) return null;

  return (
    <nav style={wrap}>
      <a href='/feed' style={navItem(pathname === '/feed')} aria-label='Feed'>
        <FeedIcon />
        <span style={label}>Feed</span>
      </a>
      <a href='/explore' style={navItem(pathname === '/explore')} aria-label='Explore'>
        <HomeIcon />
        <span style={label}>Explore</span>
      </a>
      <a href={userId ? '/listings/new' : '/login?returnTo=%2Flistings%2Fnew'} style={{ ...item, ...center }}>
        <PlusIcon />
        <span style={{ ...label, color: '#0a1205' }}>Post</span>
      </a>
      <a href='/messages' style={navItem(pathname === '/messages')}>
        <MessageIcon />
        <span style={label}>Messages</span>
      </a>
      <a href={userId ? '/dashboard' : '/login?returnTo=%2Fdashboard'} style={navItem(['/dashboard', '/profile', '/settings', '/favorites'].some((path) => pathname?.startsWith(path)))} aria-label='Your workspace'>
        <PersonIcon />
        <span style={label}>You</span>
      </a>
    </nav>
  );
}

function IconWrap({ children }) {
  return <span style={{ width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{children}</span>;
}
function HomeIcon() {
  return <IconWrap><svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M3 10.5 12 3l9 7.5' /><path d='M5 9.8V21h14V9.8' /></svg></IconWrap>;
}
function PlusIcon() {
  return <IconWrap><svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'><path d='M12 5v14M5 12h14' /></svg></IconWrap>;
}
function MessageIcon() {
  return <IconWrap><svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z' /></svg></IconWrap>;
}
function FeedIcon() {
  return <IconWrap><svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M4 19h16' /><path d='M4 12h16' /><path d='M4 5h16' /></svg></IconWrap>;
}
function PersonIcon() {
  return <IconWrap><svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='8' r='4'/><path d='M4.5 21a7.5 7.5 0 0 1 15 0'/></svg></IconWrap>;
}

const wrap = {
  position: 'fixed',
  left: 12,
  right: 12,
  bottom: 12,
  background: '#000',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 18,
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: 5,
  padding: 7,
  zIndex: 1000,
  boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
};

const item = {
  textDecoration: 'none',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.04)',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.02)',
  display: 'grid',
  placeItems: 'center',
  padding: '8px 6px',
};

const navItem = (active) => ({
  ...item,
  color: active ? '#b9ff5a' : '#e4e9e6',
  background: active ? 'rgba(185,255,90,.08)' : 'transparent',
  borderColor: active ? 'rgba(185,255,90,.16)' : 'transparent',
});

const center = {
  background: '#b9ff5a',
  color: '#0a1205',
  border: '0',
};

const label = { fontSize: 11, marginTop: 4, color: 'currentColor' };
