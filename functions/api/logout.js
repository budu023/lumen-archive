
import { json } from '../_lib/response.js';
export async function onRequestPost() { return json({ok:true},{headers:{'Set-Cookie':'lumen_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'}}); }
