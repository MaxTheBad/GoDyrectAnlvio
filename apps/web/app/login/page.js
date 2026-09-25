'use client';
import { useEffect, useState } from 'react';
import { supabase, supabaseOAuth } from '../../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [returnTo, setReturnTo] = useState('/dashboard');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const next = new URLSearchParams(window.location.search).get('returnTo');
    if (next) setReturnTo(next);
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!supabase) return setMsg('Supabase env vars are missing.');
    setSubmitting(true);
    setMsg('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setMsg(error ? error.message : 'Logged in. Redirecting...');
      if (!error) setTimeout(() => (window.location.href = returnTo || '/dashboard'), 300);
    } catch (error) {
      const networkFailure = /load failed|failed to fetch|network request failed/i.test(error?.message || '');
      setMsg(networkFailure
        ? 'Could not reach the login service. Check your connection and try again.'
        : (error?.message || 'Login failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function signInWithGoogle() {
    if (!supabaseOAuth) return setMsg('Supabase env vars are missing.');
    setSubmitting(true);
    setMsg('');
    const safeReturnTo = returnTo?.startsWith('/') ? returnTo : '/dashboard';
      const { data, error } = await supabaseOAuth.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeReturnTo)}`, skipBrowserRedirect: true },
      });
    if (error) {
      setSubmitting(false);
      setMsg(error.message);
    } else if (data?.url) window.location.assign(data.url);
    else { setSubmitting(false); setMsg('Google sign-in could not start. Please try again.'); }
  }

  return (
    <main className='auth-shell'>
      <section className='auth-story'>
        <div className='auth-story__content'>
          <div className='auth-kicker'>Your deal room</div>
          <h1>Good deals move <em>fast.</em></h1>
          <p>Pick up where you left off. Your saved opportunities, conversations, and businesses are waiting.</p>
          <div className='auth-proof'><span>Private by design</span><span>Direct conversations</span><span>No gatekeepers</span></div>
        </div>
      </section>
      <form onSubmit={submit} className='auth-card auth-form' name='login'>
        <div><div className='auth-kicker'>Welcome back</div><h2>Sign in to GoDyrect</h2><p>Enter your details to continue.</p></div>
        <label>Email address<input id='login-email' placeholder='you@company.com' type='email' name='username' inputMode='email' autoCapitalize='none' spellCheck='false' autoComplete='username' value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password<input placeholder='Your password' type='password' name='password' id='login-password' autoComplete='current-password' value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <div style={{ textAlign: 'right', marginTop: -8 }}><a href='/forgot-password' style={{ color: '#b0ff4b', fontSize: 13, fontWeight: 700 }}>Forgot password?</a></div>
        <button className='auth-submit' type='submit' disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in →'}</button>
        <div className='auth-divider' aria-hidden='true'><span />or<span /></div>
        <button className='auth-google-button' type='button' onClick={signInWithGoogle} disabled={submitting}><GoogleMark />Continue with Google</button>
        {msg ? <p className='auth-message' role='status'>{msg}</p> : null}
        <p className='auth-switch'>New here? <a href='/signup'>Create an account</a></p>
      </form>
    </main>
  );
}

function GoogleMark() {
  return <svg className='google-mark' viewBox='0 0 18 18' aria-hidden='true'><path fill='#EA4335' d='M17.64 9.205c0-.638-.057-1.251-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.909c1.702-1.568 2.683-3.878 2.683-6.614Z'/><path fill='#4285F4' d='M9 18c2.43 0 4.467-.806 5.957-2.181l-2.909-2.258c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.037-3.71H.956v2.332A9 9 0 0 0 9 18Z'/><path fill='#FBBC05' d='M3.963 10.71A5.42 5.42 0 0 1 3.681 9c0-.593.102-1.17.282-1.71V4.958H.956A9 9 0 0 0 0 9c0 1.452.348 2.827.956 4.042l3.007-2.332Z'/><path fill='#34A853' d='M9 3.58c1.322 0 2.51.455 3.445 1.348l2.584-2.584C13.463.891 11.426 0 9 0A9 9 0 0 0 .956 4.958L3.963 7.29C4.672 5.164 6.656 3.58 9 3.58Z'/></svg>;
}
