
import { sha256Hex, makeSession } from '../_lib/auth.js';
import { json } from '../_lib/response.js';
export async function onRequestPost(context) {
  try {
    const { username='', password='' } = await context.request.json();
    if (!context.env.ADMIN_USERNAME || !context.env.ADMIN_PASSWORD_SHA256 || !context.env.SESSION_SECRET) return json({error:'管理员环境变量尚未配置'}, {status:500});
    const passwordHash = await sha256Hex(password);
    if (username !== context.env.ADMIN_USERNAME || passwordHash !== context.env.ADMIN_PASSWORD_SHA256) return json({error:'账号或密码错误'}, {status:401});
    const token = await makeSession(context.env.SESSION_SECRET);
    return json({ok:true}, {headers:{'Set-Cookie':`lumen_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`}});
  } catch { return json({error:'请求格式错误'}, {status:400}); }
}
