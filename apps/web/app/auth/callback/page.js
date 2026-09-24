'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

function safeNext(value) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
}

export default function AuthCallbackPage() {
  const [message, setMessage] = useState('Finishing your secure sign-in…');

  useEffect(() => {
    let cancelled = false;

    async function waitForSession(timeoutMs = 10000) {
      const existing = await supabase.auth.getSession();
      if (existing.data?.session) return existing.data.session;

      return new Promise((resolve) => {
        let settled = false;
        const finish = (session) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          subscription?.subscription?.unsubscribe();
          resolve(session || null);
        };
        const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) finish(session);
        });
        const timer = setTimeout(async () => {
          const latest = await supabase.auth.getSession();
          finish(latest.data?.session || null);
        }, timeoutMs);
      });
    }

    async function finishSignIn() {
      if (!supabase) return setMessage('Sign-in is temporarily unavailable. Please return to GoDyrect and try again.');

      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const next = safeNext(params.get('next'));
      const code = params.get('code');

      try {
        // Supabase may return PKCE query parameters or implicit-flow hash
        // tokens. Mobile browsers can finish automatic token detection after
        // this page mounts, so handle both and then wait for auth state.
        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) throw error;
        }
        if (code) {
          const current = await supabase.auth.getSession();
          if (!current.data?.session) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error && !/already|invalid.*code|code.*verifier/i.test(error.message || '')) throw error;
          }
        }
        const session = await waitForSession();
        if (!session) throw new Error('Google did not return a usable session. Please try again.');
        window.history.replaceState({}, '', window.location.pathname);
        if (cancelled) return;
        window.location.replace(next);
      } catch (error) {
        if (!cancelled) setMessage(error?.message || 'We could not complete Google sign-in. Please try again.');
      }
    }
    finishSignIn();
    return () => { cancelled = true; };
  }, []);

  return <main className='auth-callback'><section><div className='auth-kicker'>GoDyrect</div><h1>Signing you in</h1><p role='status'>{message}</p><a href='/login'>Return to sign in</a></section></main>;
}
