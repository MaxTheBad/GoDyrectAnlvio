import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': 'https://godyrect.com', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function removeFolder(admin: ReturnType<typeof createClient>, bucket: string, prefix: string) {
  const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw error;
  const paths: string[] = [];
  for (const item of data || []) {
    const path = `${prefix}/${item.name}`;
    if (item.id) paths.push(path); else await removeFolder(admin, bucket, path);
  }
  if (paths.length) { const { error: removeError } = await admin.storage.from(bucket).remove(paths); if (removeError) throw removeError; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Sign in is required.' }, 401);
  const { confirm } = await req.json().catch(() => ({}));
  if (confirm !== true) return json({ error: 'Deletion must be confirmed.' }, 400);
  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user) return json({ error: 'Your session has expired. Please sign in again.' }, 401);
  const admin = createClient(url, serviceRoleKey);
  try {
    await Promise.all([removeFolder(admin, 'profile-photos', user.id), removeFolder(admin, 'listing-media', user.id)]);
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return json({ deleted: true });
  } catch (error) {
    console.error('Account deletion failed', error);
    return json({ error: 'We could not complete account deletion. Please contact support@godyrect.com.' }, 500);
  }
});
