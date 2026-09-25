'use client';

import { useEffect, useState } from 'react';
import { supabase, supabaseOAuth } from '../../../lib/supabase';

function safeNext(value) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
}

export default function AuthCallbackPage() {
  const [message, setMessage] = useState('Finishing your secure sign-in…');

  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      if (!supabase || !supabaseOAuth) return setMessage('Sign-in is temporarily unavailable. Please return to GoDyrect and try again.');

      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const next = safeNext(params.get('next'));
      const code = params.get('code');
      const providerError = params.get('error_description') || params.get('error') || hash.get('error_description') || hash.get('error');

      try {
        if (providerError) throw new Error(providerError);

        let session = null;
        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) throw error;
          session = data.session;
        }
        if (code) {
          const { data, error } = await supabaseOAuth.auth.exchangeCodeForSession(code);
          if (error) throw error;
          session = data.session;
          if (session) {
            const { error: persistError } = await supabase.auth.setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            });
            if (persistError) throw persistError;
          }
        }
        if (!session) {
          const current = await supabase.auth.getSession();
          session = current.data?.session || null;
        }
        if (!session) throw new Error('Google returned without an authorization code. Please restart sign-in from GoDyrect.');
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
