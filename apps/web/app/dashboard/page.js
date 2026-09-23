'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function DashboardPage() {
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState({ saved: 0, conversations: 0, listings: 0, businesses: 0 });

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return;
      const [{ data }, saved, conversations, listings, businesses] = await Promise.all([
        supabase.from('profiles').select('full_name,role,phone,avatar_url').eq('id', user.id).maybeSingle(),
        supabase.from('favorites').select('listing_id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', user.id),
        supabase.from('business_memberships').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'approved'),
      ]);
      setProfile(data || { full_name: user.email, role: 'buyer' });
      setProgress({ saved: saved.count || 0, conversations: conversations.count || 0, listings: listings.count || 0, businesses: businesses.count || 0 });
    }
    load();
  }, []);

  return (
    <main className='dash-shell'>
      <header className='dash-header'><div><div className='dash-kicker'>Your workspace</div><h1>Make your next move.</h1><p style={subcopy}>Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}. Everything you need to discover, list, and close—without the noise.</p></div><a href='/listings/new' className='dash-action primary'>List a business →</a></header>
      <div className='dash-grid'>
        <section className='dash-card dash-card--accent'><div className='dash-kicker'>Quick actions</div><h3 style={{ fontSize: 30, marginTop: 10 }}>What are you here to do?</h3><div className='dash-actions'><a href='/explore' className='dash-action primary'>Discover deals ↗</a><a href='/favorites' className='dash-action'>Review saved</a><a href='/messages' className='dash-action'>Open messages</a><a href='/businesses' className='dash-action'>Manage businesses</a></div></section>
        <section className='dash-card'><div className='dash-kicker'>Account</div><h3 style={{ marginTop: 10 }}>{profile?.full_name || 'Your profile'}</h3><div style={accountRow}><span>Mode</span><strong>{prettyRole(profile?.role)}</strong></div><div style={accountRow}><span>Phone</span><strong>{profile?.phone || 'Add phone'}</strong></div><a href='/profile' style={textLink}>Complete profile →</a></section>
        <section className='dash-card'><div className='dash-kicker'>Suggested next</div><h3 style={{ marginTop: 10 }}>{pathTitle(profile?.role)}</h3><OnboardingList items={pathItems(profile?.role, profile, progress)} /></section>
        <section className='dash-card'><div className='dash-kicker'>Workspace</div><h3 style={{ marginTop: 10 }}>Keep the deal moving</h3><div className='dash-actions'><a href='/listings' className='dash-action'>My listings</a><a href='/settings' className='dash-action'>Settings</a></div></section>
      </div>
    </main>
  );
}

function OnboardingList({ items }) {
  const complete = items.filter((item) => item.done).length;
  return (
    <div>
      <div style={progressMeta}><span>{complete} of {items.length} complete</span><span>{Math.round((complete / items.length) * 100)}%</span></div>
      <div style={progressTrack}><span style={{ ...progressFill, width: `${(complete / items.length) * 100}%` }} /></div>
      <ol style={stepList}>{items.map((item, index) => (
        <li key={item.label}>
          <a href={item.href} style={stepLink(item.done)}>
            <span style={stepNumber(item.done)}>{item.done ? '✓' : index + 1}</span>
            <span><strong style={stepTitle(item.done)}>{item.label}</strong><small style={stepHint}>{item.hint}</small></span>
            <span style={stepArrow}>{item.done ? 'Done' : '→'}</span>
          </a>
        </li>
      ))}</ol>
    </div>
  );
}
function prettyRole(role) { return role ? role.replace('_', ' ').replace(/^./, (c) => c.toUpperCase()) : 'Exploring'; }
function pathTitle(role) { if (role === 'seller') return 'Publish your first opportunity'; if (role === 'broker') return 'Build your deal workspace'; return 'Shape your buyer shortlist'; }
function pathItems(role, profile, progress) {
  if (role === 'seller') return [
    { label: 'Set up your business', hint: 'Add the details buyers need', href: '/businesses?create=1', done: progress.businesses > 0 },
    { label: 'Publish your first listing', hint: 'Turn the business into an opportunity', href: '/listings/new', done: progress.listings > 0 },
    { label: 'Respond to buyer interest', hint: 'Keep every deal conversation moving', href: '/messages', done: progress.conversations > 0 },
  ];
  if (role === 'broker') return [
    { label: 'Complete your profile', hint: 'Build trust with buyers and owners', href: '/profile', done: Boolean(profile?.full_name && profile?.phone) },
    { label: 'Add represented businesses', hint: 'Create your active deal workspace', href: '/businesses?create=1', done: progress.businesses > 0 },
    { label: 'Manage active conversations', hint: 'Follow up from one inbox', href: '/messages', done: progress.conversations > 0 },
  ];
  return [
    { label: 'Explore the marketplace', hint: 'Find businesses that fit your thesis', href: '/explore', done: false },
    { label: 'Save opportunities', hint: progress.saved ? `${progress.saved} saved` : 'Build a shortlist worth watching', href: '/favorites', done: progress.saved > 0 },
    { label: 'Message the right seller', hint: progress.conversations ? `${progress.conversations} conversation${progress.conversations === 1 ? '' : 's'} started` : 'Ask questions directly', href: '/messages', done: progress.conversations > 0 },
  ];
}
const subcopy = { maxWidth: 650, margin: '14px 0 0', color: '#98a39e', lineHeight: 1.6 };
const accountRow = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(229,255,242,.11)', color: '#98a39e' };
const textLink = { display: 'inline-flex', marginTop: 18, color: '#b9ff5a', textDecoration: 'none', fontWeight: 700 };
const stepList = { display: 'grid', gap: 10, margin: 0, padding: 0, listStyle: 'none' };
const progressMeta = { display: 'flex', justifyContent: 'space-between', marginBottom: 7, color: '#98a39e', fontSize: 12, fontWeight: 700 };
const progressTrack = { height: 5, marginBottom: 16, overflow: 'hidden', borderRadius: 999, background: 'rgba(255,255,255,.07)' };
const progressFill = { display: 'block', height: '100%', borderRadius: 999, background: '#b9ff5a', transition: 'width .25s ease' };
const stepLink = (done) => ({ display: 'grid', gridTemplateColumns: '34px minmax(0,1fr) auto', gap: 11, alignItems: 'center', padding: 12, border: `1px solid ${done ? 'rgba(185,255,90,.2)' : 'rgba(229,255,242,.11)'}`, borderRadius: 13, color: '#f4f7f5', background: done ? 'rgba(185,255,90,.055)' : '#141817', textDecoration: 'none' });
const stepNumber = (done) => ({ width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 9, color: done ? '#0a1205' : '#b9ff5a', background: done ? '#b9ff5a' : 'rgba(185,255,90,.09)', fontSize: 13, fontWeight: 800 });
const stepTitle = (done) => ({ display: 'block', color: done ? '#b7c0bb' : '#f4f7f5', textDecoration: done ? 'line-through' : 'none', fontSize: 14 });
const stepHint = { display: 'block', marginTop: 3, color: '#7f8a85', fontSize: 12 };
const stepArrow = { color: '#b9ff5a', fontSize: 12, fontWeight: 800 };
