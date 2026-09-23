const origin = process.env.SMOKE_ORIGIN || 'https://godyrect.com';
const routes = [
  '/', '/explore', '/feed', '/favorites', '/login', '/signup', '/dashboard',
  '/messages', '/businesses', '/listings', '/listings/new', '/profile',
  '/settings', '/contactus', '/about', '/legal/privacy',
];

const failures = [];
for (const route of routes) {
  const response = await fetch(`${origin}${route}`, { redirect: 'manual' });
  if (response.status < 200 || response.status >= 400) failures.push(`${route}: ${response.status}`);
}

const proxyGuard = await fetch(`${origin}/api/supabase-proxy`);
if (proxyGuard.status !== 400) failures.push(`/api/supabase-proxy guard: ${proxyGuard.status}`);

if (failures.length) {
  console.error(`Smoke test failed:\n${failures.join('\n')}`);
  process.exit(1);
}

console.log(`Smoke test passed for ${routes.length} routes and the API proxy guard.`);
