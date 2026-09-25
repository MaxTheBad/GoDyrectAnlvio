'use client';

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

const TOKEN_KEY = 'godyrect-native-push-token';

export default function NativeAppBridge() {
  useEffect(() => {
    if (!supabase) return undefined;

    async function registerToken(token) {
      if (!token) return;
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return;

      await supabase.from('app_device_tokens').upsert(
        {
          user_id: user.id,
          token,
          platform: 'ios',
          is_active: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      );
    }

    function onToken(event) {
      const token = event?.detail?.token;
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        registerToken(token);
      }
    }

    window.addEventListener('godyrect:native-push-token', onToken);
    registerToken(localStorage.getItem(TOKEN_KEY));

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        registerToken(localStorage.getItem(TOKEN_KEY));
      }
    });

    return () => {
      window.removeEventListener('godyrect:native-push-token', onToken);
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return null;
}
