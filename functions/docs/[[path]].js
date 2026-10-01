import { requireAdmin } from '../_lib/auth.js';

export async function onRequestGet(context) {
  if (!(await requireAdmin(context))) {
    return new Response('Unauthorized', {
      status: 401,
      headers: {'Cache-Control':'no-store'}
    });
  }
  if (!context.env.PRIVATE_MEDIA) return new Response('R2 not configured', {status:503});

  const parts = context.params.path;
  const rawPath = Array.isArray(parts) ? parts.map(decodeURIComponent).join('/') : String(parts || '');
  const key = rawPath.startsWith('private-docs/') ? rawPath : `private-docs/${rawPath}`;
  if (!key || key.includes('..')) return new Response('Bad request', {status:400});

  const object = await context.env.PRIVATE_MEDIA.get(key);
  if (!object || !('body' in object)) return new Response('Not found', {status:404});

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'self';");
  return new Response(object.body, {status:200, headers});
}
