export async function onRequestGet(context) {
  const token = context.env.APPLE_MAPS_TOKEN;
  if (!token) return new Response(JSON.stringify({ message: 'Maps is not configured yet.' }), { status: 503, headers: jsonHeaders() });
  return new Response(JSON.stringify({ token }), { headers: jsonHeaders() });
}

function jsonHeaders() {
  return { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
}
