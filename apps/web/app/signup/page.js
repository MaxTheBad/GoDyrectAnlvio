'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('buyer');
  const [msg, setMsg] = useState('');
  const [agree, setAgree] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErrors({});
    if (!supabase) return setMsg('Supabase env vars are missing.');
    if (!agree) return setMsg('Please agree to the policy before creating an account.');
    if (password.length < 8) return setMsg('Use at least 8 characters for your password.');

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/confirmed`,
        data: {
          full_name: fullName,
          phone,
          role,
          marketing_opt_in: marketingOptIn,
          terms_accepted_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      setSubmitting(false);
      const errMsg = String(error.message || '').toLowerCase();
      if (errMsg.includes('already registered') || errMsg.includes('user already registered') || errMsg.includes('duplicate')) {
        return setMsg('That email already exists. Please sign in instead.');
      }
      return setMsg(error.message);
    }

    const userId = data?.user?.id;
    if (userId) {
      await supabase.from('profiles').upsert({
        id: userId,
        full_name: fullName,
        phone,
        role,
        marketing_opt_in: marketingOptIn,
        terms_accepted_at: new Date().toISOString(),
      });
    }

    setConfirmationSent(true);
    setMsg('');
    setSubmitting(false);
  }

  async function signUpWithGoogle() {
    setErrors({});
    if (!supabase) return setMsg('Supabase env vars are missing.');
    if (!agree) return setMsg('Please agree to the policy before continuing with Google.');
    setSubmitting(true);
    setMsg('');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=%2Fdashboard`,
        skipBrowserRedirect: true,
        data: {
          full_name: fullName || undefined,
          phone: phone || undefined,
          role,
          marketing_opt_in: marketingOptIn,
          terms_accepted_at: new Date().toISOString(),
        },
      },
    });
    if (error) {
      setSubmitting(false);
      setMsg(error.message);
    } else if (data?.url) window.location.assign(data.url);
    else { setSubmitting(false); setMsg('Google sign-in could not start. Please try again.'); }
  }

  async function resendConfirmation() {
    if (!supabase || !email || cooldown > 0) return;
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) return setMsg(error.message);

    setMsg('Confirmation email sent again. Check spam/promotions too.');
    setCooldown(45);
    startCountdown(45);
  }



  function markInvalid(field, message) {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }

  function startCountdown(seconds) {
    setCooldown(seconds);
    const timer = setInterval(() => {
      setCooldown((curr) => {
        if (curr <= 1) {
          clearInterval(timer);
          return 0;
        }
        return curr - 1;
      });
    }, 1000);
  }

  return (
    <main className='auth-shell auth-shell--signup'>
      <section className='auth-story'>
        <div className='auth-story__content'><div className='auth-kicker'>Start moving</div><h1>Your next move starts <em>here.</em></h1><p>Discover opportunities, reach decision-makers directly, and keep every conversation in one focused workspace.</p></div>
      </section>
      <div className='auth-card'>
        {!confirmationSent ? (
          <form onSubmit={submit} className='auth-form'>
            <div><div className='auth-kicker'>Join GoDyrect</div><h2>Create your account</h2><p>Free to join. Set up takes less than a minute.</p></div>

            <label>Full name<input className={errors.fullName ? 'is-error' : ''} placeholder='John Smith' value={fullName} onChange={(e) => setFullName(e.target.value)} onInvalid={(e)=>{e.preventDefault(); markInvalid('fullName','Full name is required.');}} onInput={()=>setErrors((p)=>({ ...p, fullName: '' }))} required /></label>
            {errors.fullName ? <small style={errText}>{errors.fullName}</small> : null}

            <label>Email address<input className={errors.email ? 'is-error' : ''} type='email' name='email' autoComplete='email' placeholder='you@company.com' value={email} onChange={(e) => setEmail(e.target.value)} onInvalid={(e)=>{e.preventDefault(); markInvalid('email','Valid email is required.');}} onInput={()=>setErrors((p)=>({ ...p, email: '' }))} required /></label>
            {errors.email ? <small style={errText}>{errors.email}</small> : null}

            <label>Phone number<input className={errors.phone ? 'is-error' : ''} placeholder='+1 (555) 555-5555' value={phone} onChange={(e) => setPhone(e.target.value)} onInvalid={(e)=>{e.preventDefault(); markInvalid('phone','Phone number is required.');}} onInput={()=>setErrors((p)=>({ ...p, phone: '' }))} required /></label>
            {errors.phone ? <small style={errText}>{errors.phone}</small> : null}

            <fieldset className='choice-group'><legend>I’m joining as</legend><div className='choice-row'>{[['buyer','Buyer'],['seller','Seller'],['broker','Broker'],['not_sure','Exploring']].map(([value,label]) => <button key={value} type='button' className={role === value ? 'is-active' : ''} onClick={() => setRole(value)}>{label}</button>)}</div></fieldset>

            <label>Password<input
              className={errors.password ? 'is-error' : ''}
              placeholder='Create a password'
              type='password'
              name='password'
              id='signup-password'
              autoComplete='new-password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onInvalid={(e)=>{e.preventDefault(); markInvalid('password','Password is required.');}}
              onInput={()=>setErrors((p)=>({ ...p, password: '' }))}
              required
              minLength={8}
            /></label>
            {errors.password ? <small style={errText}>{errors.password}</small> : null}

            <label className='check-row'>
              <input type='checkbox' checked={agree} onChange={(e) => setAgree(e.target.checked)} onInvalid={(e)=>{e.preventDefault(); markInvalid('agree','You must agree before creating an account.');}} onInput={()=>setErrors((p)=>({ ...p, agree: '' }))} required />
              <span>I agree to the <a href='/legal/privacy'>Privacy & Terms</a></span>
            </label>
            {errors.agree ? <small style={errText}>{errors.agree}</small> : null}

            <label className='check-row'>
              <input type='checkbox' checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} />
              Subscribe to product and listing email updates (optional)
            </label>

            <button className='auth-submit' type='submit' disabled={submitting}>{submitting ? 'Creating account…' : 'Create account →'}</button>
            <div className='auth-divider' aria-hidden='true'><span />or<span /></div>
            <button className='auth-google-button' type='button' onClick={signUpWithGoogle} disabled={submitting}><GoogleMark />Continue with Google</button>
            {msg ? <p className='auth-message'>{msg}</p> : null}
            <p className='auth-switch'>Already have an account? <a href='/login'>Sign in</a></p>
          </form>
        ) : (
          <div className='auth-form'>
            <div className='auth-kicker'>One last step</div><h2>Check your email</h2>
            <p>
              We sent a confirmation link to <strong>{email}</strong>. Please confirm your account, and check spam/promotions if you don't see it.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className='auth-submit' onClick={resendConfirmation} disabled={cooldown > 0}>
                {cooldown > 0 ? `For security purposes, you can only request this after ${cooldown} seconds.` : 'Resend confirmation'}
              </button>
              <a href='/login' className='auth-secondary'>Go to login</a>
            </div>
            {msg ? <p style={{ marginBottom: 0 }}>{msg}</p> : null}
          </div>
        )}
      </div>
    </main>
  );
}

function GoogleMark() {
  return <svg className='google-mark' viewBox='0 0 18 18' aria-hidden='true'><path fill='#EA4335' d='M17.64 9.205c0-.638-.057-1.251-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.909c1.702-1.568 2.683-3.878 2.683-6.614Z'/><path fill='#4285F4' d='M9 18c2.43 0 4.467-.806 5.957-2.181l-2.909-2.258c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.037-3.71H.956v2.332A9 9 0 0 0 9 18Z'/><path fill='#FBBC05' d='M3.963 10.71A5.42 5.42 0 0 1 3.681 9c0-.593.102-1.17.282-1.71V4.958H.956A9 9 0 0 0 0 9c0 1.452.348 2.827.956 4.042l3.007-2.332Z'/><path fill='#34A853' d='M9 3.58c1.322 0 2.51.455 3.445 1.348l2.584-2.584C13.463.891 11.426 0 9 0A9 9 0 0 0 .956 4.958L3.963 7.29C4.672 5.164 6.656 3.58 9 3.58Z'/></svg>;
}

const errText = { color: '#ff8a80', fontSize: 12, marginTop: -4 };
