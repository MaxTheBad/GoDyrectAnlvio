export function onRequestGet(context) {
  return Response.redirect(new URL('/explore', context.request.url), 302);
}
