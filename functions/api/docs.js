import { requireAdmin } from '../_lib/auth.js';
import { json } from '../_lib/response.js';

const MAX_BYTES = 100 * 1024 * 1024;
const ALLOWED = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/rtf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-7z-compressed',
  'application/x-rar-compressed'
]);

function safeName(name='document') {
  return String(name).replace(/[\/\\\0]/g, '_').slice(0, 180) || 'document';
}

export async function onRequestGet(context) {
  if (!(await requireAdmin(context))) return json({error:'未登录或会话已过期'}, {status:401});
  try {
    const rows = await context.env.DB.prepare(
      "SELECT id,name,r2_key,content_type,size,created_at FROM private_documents ORDER BY created_at DESC"
    ).all();
    return json({documents: rows.results || []});
  } catch {
    return json({error:'数据库尚未初始化，请先执行 schema-private-docs.sql'}, {status:503});
  }
}

export async function onRequestPost(context) {
  if (!(await requireAdmin(context))) return json({error:'未登录或会话已过期'}, {status:401});
  if (!context.env.PRIVATE_MEDIA) return json({error:'私人 R2 尚未绑定，请确认 PRIVATE_MEDIA bucket 已绑定。'}, {status:503});

  let form;
  try { form = await context.request.formData(); }
  catch { return json({error:'无法读取上传数据'}, {status:400}); }

  const file = form.get('file');
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
    return json({error:'没有收到文档文件'}, {status:400});
  }
  if (!file.size || file.size > MAX_BYTES) {
    return json({error:'文档大小不能超过 100 MB'}, {status:413});
  }
  if (file.type && !ALLOWED.has(file.type)) {
    return json({error:'暂不支持这种文档格式'}, {status:415});
  }

  const id = crypto.randomUUID();
  const originalName = safeName(file.name || 'document');
  const key = `private-docs/${id}-${originalName}`;

  try {
    await context.env.PRIVATE_MEDIA.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
        contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(originalName)}`,
        cacheControl: 'private, no-store'
      },
      customMetadata: { originalName }
    });

    await context.env.DB.prepare(
      "INSERT INTO private_documents(id,name,r2_key,content_type,size) VALUES(?,?,?,?,?)"
    ).bind(id, originalName, key, file.type || 'application/octet-stream', file.size).run();

    return json({ok:true, document:{id,name:originalName,content_type:file.type || 'application/octet-stream',size:file.size}});
  } catch (e) {
    await context.env.PRIVATE_MEDIA.delete(key).catch(()=>{});
    return json({error:'保存文档失败'}, {status:500});
  }
}

export async function onRequestDelete(context) {
  if (!(await requireAdmin(context))) return json({error:'未登录或会话已过期'}, {status:401});
  if (!context.env.PRIVATE_MEDIA) return json({error:'R2 尚未绑定'}, {status:503});

  const id = new URL(context.request.url).searchParams.get('id') || '';
  if (!id) return json({error:'缺少文档 ID'}, {status:400});

  try {
    const row = await context.env.DB.prepare(
      "SELECT r2_key FROM private_documents WHERE id=?"
    ).bind(id).first();
    if (!row) return json({error:'文档不存在'}, {status:404});

    await context.env.PRIVATE_MEDIA.delete(row.r2_key);
    await context.env.DB.prepare("DELETE FROM private_documents WHERE id=?").bind(id).run();
    return json({ok:true});
  } catch {
    return json({error:'删除文档失败'}, {status:500});
  }
}
