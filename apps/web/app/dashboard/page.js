'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function DashboardPage() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name,role,phone,avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      setProfile(data || { full_name: user.email, role: 'buyer' });
    }
    load();
  }, []);

  return (
    <main className='dash-shell'>
      <header className='dash-header'><div><div className='dash-kicker'>Your workspace</div><h1>Make your next move.</h1><p style={subcopy}>Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}. Everything you need to discover, list, and close—without the noise.</p></div><a href='/listings/new' className='dash-action primary'>List a business →</a></header>
      <div className='dash-grid'>
        <section className='dash-card dash-card--accent'><div className='dash-kicker'>Quick actions</div><h3 style={{ fontSize: 30, marginTop: 10 }}>What are you here to do?</h3><div className='dash-actions'><a href='/explore' className='dash-action primary'>Discover deals ↗</a><a href='/favorites' className='dash-action'>Review saved</a><a href='/messages' className='dash-action'>Open messages</a><a href='/businesses' className='dash-action'>Manage businesses</a></div></section>
        <section className='dash-card'><div className='dash-kicker'>Account</div><h3 style={{ marginTop: 10 }}>{profile?.full_name || 'Your profile'}</h3><div style={accountRow}><span>Mode</span><strong>{prettyRole(profile?.role)}</strong></div><div style={accountRow}><span>Phone</span><strong>{profile?.phone || 'Add phone'}</strong></div><a href='/profile' style={textLink}>Complete profile →</a></section>
        <section className='dash-card'><div className='dash-kicker'>Suggested next</div><h3 style={{ marginTop: 10 }}>{pathTitle(profile?.role)}</h3><OnboardingList items={pathItems(profile?.role)} /></section>
        <section className='dash-card'><div className='dash-kicker'>Workspace</div><h3 style={{ marginTop: 10 }}>Keep the deal moving</h3><div className='dash-actions'><a href='/listings' className='dash-action'>My listings</a><a href='/settings' className='dash-action'>Settings</a></div></section>
      </div>
    </main>
  );
}

function OnboardingList({ items }) {
  return (
    <div>
      <ol style={stepList}>{items.map((item, index) => <li key={item}><span>{index + 1}</span>{item}</li>)}</ol>
    </div>
  );
}
function prettyRole(role) { return role ? role.replace('_', ' ').replace(/^./, (c) => c.toUpperCase()) : 'Exploring'; }
function pathTitle(role) { if (role === 'seller') return 'Publish your first opportunity'; if (role === 'broker') return 'Build your deal workspace'; return 'Shape your buyer shortlist'; }
function pathItems(role) { if (role === 'seller') return ['Finish the business details', 'Create a listing buyers understand', 'Respond directly to interest']; if (role === 'broker') return ['Complete your profile', 'Add the businesses you represent', 'Manage listings and messages']; return ['Explore the live marketplace', 'Save opportunities worth watching', 'Message the right seller directly']; }
const subcopy = { maxWidth: 650, margin: '14px 0 0', color: '#98a39e', lineHeight: 1.6 };
const accountRow = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(229,255,242,.11)', color: '#98a39e' };
const textLink = { display: 'inline-flex', marginTop: 18, color: '#b9ff5a', textDecoration: 'none', fontWeight: 700 };
const stepList = { display: 'grid', gap: 10, margin: 0, padding: 0, listStyle: 'none' };
