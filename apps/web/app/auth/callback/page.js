'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

function safeNext(value) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
}

export default function AuthCallbackPage() {
  const [message, setMessage] = useState('Finishing your secure sign-in…');

  useEffect(() => {
    async function finishSignIn() {
      if (!supabase) return setMessage('Sign-in is temporarily unavailable. Please return to GoDyrect and try again.');

      const params = new URLSearchParams(window.location.search);
      const next = safeNext(params.get('next'));
      const code = params.get('code');

      try {
        // OAuth returns a one-time PKCE code. Explicitly exchanging it here
        // guarantees that the session is stored before protected pages load.
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Google did not return a usable session. Please try again.');
        window.location.replace(next);
      } catch (error) {
        setMessage(error?.message || 'We could not complete Google sign-in. Please try again.');
      }
    }
    finishSignIn();
  }, []);

  return <main className='auth-callback'><section><div className='auth-kicker'>GoDyrect</div><h1>Signing you in</h1><p role='status'>{message}</p><a href='/login'>Return to sign in</a></section></main>;
}
