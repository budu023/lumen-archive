
import { requireAdmin } from '../_lib/auth.js';
import { json } from '../_lib/response.js';

export async function onRequestGet(context) {
  try {
    const row = await context.env.DB.prepare("SELECT value FROM site_content WHERE key='main'").first();
    if (!row?.value) return json({});
    return json(JSON.parse(row.value));
  } catch (e) { return json({error:'数据库尚未初始化'}, {status:503}); }
}

export async function onRequestPost(context) {
  if (!(await requireAdmin(context))) return json({error:'未登录或会话已过期'}, {status:401});
  let payload;
  try { payload = await context.request.json(); } catch { return json({error:'JSON 格式错误'}, {status:400}); }
  const text = JSON.stringify(payload);
  if (text.length > 200000) return json({error:'内容数据过大'}, {status:413});
  try {
    await context.env.DB.prepare("INSERT INTO site_content(key,value,updated_at) VALUES('main',?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')").bind(text).run();
    return json({ok:true});
  } catch (e) { return json({error:'写入数据库失败'}, {status:500}); }
}
