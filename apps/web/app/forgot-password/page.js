'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!supabase) return setMessage('Password recovery is temporarily unavailable.');
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return setMessage(error.message);
    setSent(true);
  }

  return <main className='auth-shell'>
    <section className='auth-story'><div className='auth-story__content'><div className='auth-kicker'>Account recovery</div><h1>Get back to the <em>deal.</em></h1><p>We’ll send one secure link to reset your password. No support ticket, no waiting around.</p></div></section>
    <section className='auth-card auth-form'>
      <div><div className='auth-kicker'>{sent ? 'Check your inbox' : 'Reset password'}</div><h2>{sent ? 'Your secure link is on the way.' : 'Where should we send it?'}</h2><p>{sent ? `If an account exists for ${email}, you’ll receive a GoDyrect recovery email shortly.` : 'Enter the email connected to your GoDyrect account.'}</p></div>
      {!sent ? <form onSubmit={submit} className='auth-form'>
        <label>Email address<input type='email' autoComplete='email' placeholder='you@company.com' value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <button className='auth-submit' disabled={busy}>{busy ? 'Sending…' : 'Send reset link →'}</button>
      </form> : null}
      {message ? <p className='auth-message' role='status'>{message}</p> : null}
      <p className='auth-switch'><a href='/login'>← Back to sign in</a></p>
    </section>
  </main>;
}
