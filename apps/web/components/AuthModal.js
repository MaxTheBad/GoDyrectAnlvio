'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';

const protectedPrefixes = ['/dashboard', '/messages', '/favorites', '/businesses', '/listings/new', '/listings/edit', '/listings', '/profile', '/settings', '/onboarding'];

function needsAuth(pathname) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function AuthModal() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState('/dashboard');
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    supabase.auth.getUser().then(({ data }) => { setUser(data?.user || null); setReady(true); });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => subscription?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (ready && !user && needsAuth(pathname)) {
      setIntent(`${pathname}${window.location.search}`);
      setOpen(true);
    }
  }, [pathname, ready, user]);

  useEffect(() => {
    function intercept(event) {
      if (!ready || user || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.('a[href]');
      if (!anchor || anchor.target === '_blank') return;
      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin || !needsAuth(url.pathname)) return;
      event.preventDefault();
      setIntent(`${url.pathname}${url.search}`);
      setOpen(true);
    }
    document.addEventListener('click', intercept, true);
    return () => document.removeEventListener('click', intercept, true);
  }, [ready, user]);

  async function continueWithGoogle() {
    if (!supabase) return setMessage('Sign-in is temporarily unavailable.');
    if (mode === 'signup' && !agree) return setMessage('Please agree to Privacy & Terms before continuing.');
    setBusy(true); setMessage('');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // Complete the PKCE exchange on a dedicated page before sending someone
      // back to the part of the product they were trying to use.
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(intent)}`, skipBrowserRedirect: true },
    });
    if (error) { setBusy(false); setMessage(error.message); }
    else if (data?.url) window.location.assign(data.url);
    else { setBusy(false); setMessage('Google sign-in could not start. Please try again.'); }
  }

  async function submit(event) {
    event.preventDefault();
    if (!supabase) return setMessage('Sign-in is temporarily unavailable.');
    if (mode === 'signup' && !agree) return setMessage('Please agree to Privacy & Terms before continuing.');
    setBusy(true); setMessage('');
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}${intent}`, data: { terms_accepted_at: new Date().toISOString() } } });
    if (result.error) { setBusy(false); return setMessage(result.error.message); }
    if (mode === 'signup' && !result.data?.session) { setBusy(false); return setMessage('Check your email to confirm your account, then return here.'); }
    window.location.assign(intent);
  }

  if (!open || user || pathname === '/login' || pathname === '/signup') return null;
  return <div className='auth-modal-backdrop' role='presentation' onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
    <section className='auth-modal' role='dialog' aria-modal='true' aria-labelledby='auth-modal-title'>
      <button type='button' className='auth-modal__close' onClick={() => setOpen(false)} aria-label='Close sign in'>×</button>
      <div className='auth-kicker'>{mode === 'signin' ? 'Welcome back' : 'Join GoDyrect'}</div>
      <h2 id='auth-modal-title'>{mode === 'signin' ? 'Continue the conversation.' : 'Start moving directly.'}</h2>
      <p>{mode === 'signin' ? 'Sign in to access your workspace, saved opportunities, and deal inbox.' : 'Create an account to save opportunities, message owners, and publish listings.'}</p>
      <button type='button' className='auth-google-button' onClick={continueWithGoogle} disabled={busy}><GoogleMark />Continue with Google</button>
      <div className='auth-divider' aria-hidden='true'><span />or<span /></div>
      <form className='auth-modal__form' onSubmit={submit}>
        <input type='email' autoComplete='email' value={email} onChange={(event) => setEmail(event.target.value)} placeholder='Email address' required />
        <input type='password' autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder='Password' minLength={mode === 'signup' ? 8 : undefined} required />
        {mode === 'signup' ? <label className='check-row'><input type='checkbox' checked={agree} onChange={(event) => setAgree(event.target.checked)} /><span>I agree to the <a href='/legal/privacy'>Privacy & Terms</a></span></label> : null}
        <button className='auth-submit' type='submit' disabled={busy}>{busy ? 'Working…' : mode === 'signin' ? 'Sign in →' : 'Create account →'}</button>
      </form>
      {message ? <p className='auth-message' role='status'>{message}</p> : null}
      <p className='auth-switch'>{mode === 'signin' ? 'New here?' : 'Already have an account?'} <button type='button' onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(''); }}>{mode === 'signin' ? 'Create an account' : 'Sign in'}</button></p>
    </section>
  </div>;
}

function GoogleMark() {
  return <svg className='google-mark' viewBox='0 0 18 18' aria-hidden='true'><path fill='#EA4335' d='M17.64 9.205c0-.638-.057-1.251-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.909c1.702-1.568 2.683-3.878 2.683-6.614Z'/><path fill='#4285F4' d='M9 18c2.43 0 4.467-.806 5.957-2.181l-2.909-2.258c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.037-3.71H.956v2.332A9 9 0 0 0 9 18Z'/><path fill='#FBBC05' d='M3.963 10.71A5.42 5.42 0 0 1 3.681 9c0-.593.102-1.17.282-1.71V4.958H.956A9 9 0 0 0 0 9c0 1.452.348 2.827.956 4.042l3.007-2.332Z'/><path fill='#34A853' d='M9 3.58c1.322 0 2.51.455 3.445 1.348l2.584-2.584C13.463.891 11.426 0 9 0A9 9 0 0 0 .956 4.958L3.963 7.29C4.672 5.164 6.656 3.58 9 3.58Z'/></svg>;
}
