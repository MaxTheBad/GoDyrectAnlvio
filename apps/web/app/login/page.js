'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

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
    if (!supabase) return setMsg('Supabase env vars are missing.');
    setSubmitting(true);
    setMsg('');
    const safeReturnTo = returnTo?.startsWith('/') ? returnTo : '/dashboard';
      const { data, error } = await supabase.auth.signInWithOAuth({
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
      <form onSubmit={submit} className='auth-card auth-form'>
        <div><div className='auth-kicker'>Welcome back</div><h2>Sign in to GoDyrect</h2><p>Enter your details to continue.</p></div>
        <label>Email address<input placeholder='you@company.com' type='email' name='email' autoComplete='email' value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password<input placeholder='Your password' type='password' name='password' id='login-password' autoComplete='current-password' value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <button className='auth-submit' type='submit' disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in →'}</button>
        <div className='auth-divider' aria-hidden='true'><span />or<span /></div>
        <button className='auth-secondary' type='button' onClick={signInWithGoogle} disabled={submitting}>Continue with Google</button>
        {msg ? <p className='auth-message' role='status'>{msg}</p> : null}
        <p className='auth-switch'>New here? <a href='/signup'>Create an account</a></p>
      </form>
    </main>
  );
}
