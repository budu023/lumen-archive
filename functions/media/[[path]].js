export async function onRequestGet(context) {
  if (!context.env.MEDIA) return new Response('R2 not configured', {status:503});
  const parts = context.params.path;
  const key = Array.isArray(parts) ? parts.map(decodeURIComponent).join('/') : String(parts || '');
  if (!key || key.includes('..')) return new Response('Bad request', {status:400});

  const object = await context.env.MEDIA.get(key);
  if (!object || !('body' in object)) return new Response('Not found', {status:404});

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', object.httpMetadata?.cacheControl || 'public, max-age=31536000, immutable');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(object.body, {status:200, headers});
}
