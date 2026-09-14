
const encoder = new TextEncoder();

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function b64url(bytes) {
  let bin = ''; for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function fromB64url(s) {
  s = s.replace(/-/g,'+').replace(/_/g,'/'); while (s.length % 4) s += '=';
  const bin = atob(s); return Uint8Array.from(bin, c => c.charCodeAt(0));
}
async function sign(text, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(text))));
}
export async function makeSession(secret, ttlSeconds=60*60*12) {
  const payload = b64url(encoder.encode(JSON.stringify({exp: Math.floor(Date.now()/1000)+ttlSeconds, role:'admin'})));
  return `${payload}.${await sign(payload, secret)}`;
}
export async function verifySession(token, secret) {
  if (!token || !secret) return false;
  const [payload, sig] = token.split('.'); if (!payload || !sig) return false;
  const expected = await sign(payload, secret); if (expected !== sig) return false;
  try { const json = JSON.parse(new TextDecoder().decode(fromB64url(payload))); return json.role==='admin' && json.exp > Math.floor(Date.now()/1000); } catch { return false; }
}
export function cookieValue(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const part = cookie.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='));
  return part ? decodeURIComponent(part.slice(name.length+1)) : '';
}
export async function requireAdmin(context) {
  const token = cookieValue(context.request, 'lumen_admin');
  return verifySession(token, context.env.SESSION_SECRET);
}
