'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('Validating your secure link…');
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return setMessage('Password recovery is temporarily unavailable.');
    let active = true;
    async function loadSession() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) await supabase.auth.exchangeCodeForSession(code);
      const current = await supabase.auth.getSession();
      if (!active) return;
      if (current.data?.session) {
        setReady(true);
        setMessage('');
        return;
      }
      let authSubscription;
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active || !session) return;
        setReady(true);
        setMessage('');
        authSubscription?.unsubscribe();
      });
      authSubscription = listener?.subscription;
      setTimeout(async () => {
        const latest = await supabase.auth.getSession();
        if (active && !latest.data?.session) setMessage('This reset link is invalid or expired. Request a new one.');
      }, 7000);
    }
    loadSession();
    return () => { active = false; };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (password.length < 8) return setMessage('Use at least 8 characters.');
    if (password !== confirmPassword) return setMessage('The passwords do not match.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setMessage(error.message);
    setComplete(true);
    setMessage('');
  }

  return <main className='auth-shell'>
    <section className='auth-story'><div className='auth-story__content'><div className='auth-kicker'>Secure reset</div><h1>Choose a stronger <em>way back in.</em></h1><p>Your new password should be unique to GoDyrect and at least eight characters long.</p></div></section>
    <section className='auth-card auth-form'>
      <div><div className='auth-kicker'>{complete ? 'All set' : 'New password'}</div><h2>{complete ? 'Your password is updated.' : 'Create your new password'}</h2></div>
      {ready && !complete ? <form onSubmit={submit} className='auth-form'>
        <label>New password<input type='password' autoComplete='new-password' minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <label>Confirm new password<input type='password' autoComplete='new-password' minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
        <button className='auth-submit' disabled={busy}>{busy ? 'Updating…' : 'Update password →'}</button>
      </form> : null}
      {complete ? <a className='auth-submit' href='/login'>Return to sign in →</a> : null}
      {message ? <p className='auth-message' role='status'>{message}</p> : null}
      {!ready && /expired|invalid/i.test(message) ? <a className='auth-secondary' href='/forgot-password'>Request another link</a> : null}
    </section>
  </main>;
}
