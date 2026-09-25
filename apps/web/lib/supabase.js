import { createClient } from '@supabase/supabase-js';

// These are public browser credentials, not server secrets. Keeping production
// fallbacks here prevents a static export from silently shipping without auth
// when a deploy shell is missing its build-time environment variables.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  || 'https://elcoibbmnjejkdbourjv.supabase.co';
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || 'sb_publishable_QhYTA1CXDUVIZtM2-BLWEw_LvBX4ixt';

async function resilientFetch(input, init) {
  const request = new Request(input, init);

  try {
    return await fetch(request.clone());
  } catch (error) {
    const isSupabaseRequest = supabaseUrl && request.url.startsWith(supabaseUrl);
    const canUseProxy = typeof window !== 'undefined' && isSupabaseRequest;
    if (!canUseProxy) throw error;

    const methodHasBody = !['GET', 'HEAD'].includes(request.method);
    const body = methodHasBody ? await request.arrayBuffer() : undefined;
    return fetch(`/api/supabase-proxy?url=${encodeURIComponent(request.url)}`, {
      method: request.method,
      headers: request.headers,
      body,
      cache: 'no-store',
      credentials: 'same-origin',
    });
  }
}

export const supabase =
  supabaseUrl && supabaseAnon
    ? createClient(supabaseUrl, supabaseAnon, {
        global: { fetch: resilientFetch },
      })
    : null;

// OAuth uses an isolated PKCE client so its verifier cannot race with the
// implicit-link handling used by email confirmations and recovery flows.
// The callback copies the resulting session into the primary client.
export const supabaseOAuth =
  supabaseUrl && supabaseAnon
    ? createClient(supabaseUrl, supabaseAnon, {
        global: { fetch: resilientFetch },
        auth: {
          flowType: 'pkce',
          detectSessionInUrl: false,
          persistSession: true,
          storageKey: 'godyrect-oauth-session',
        },
      })
    : null;
