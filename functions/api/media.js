import { requireAdmin } from '../_lib/auth.js';
import { json } from '../_lib/response.js';

const MAX_BYTES = 15 * 1024 * 1024;
const TYPES = {
  'image/jpeg':'jpg',
  'image/png':'png',
  'image/webp':'webp',
  'image/gif':'gif',
  'image/avif':'avif'
};

export async function onRequestGet(context) {
  if (!(await requireAdmin(context))) return json({error:'未登录或会话已过期'}, {status:401});
  return json({configured:Boolean(context.env.MEDIA)});
}

export async function onRequestPost(context) {
  if (!(await requireAdmin(context))) return json({error:'未登录或会话已过期'}, {status:401});
  if (!context.env.MEDIA) return json({error:'R2 尚未绑定。请把 R2 bucket 以 MEDIA 变量名绑定到 Pages。'}, {status:503});
  let form;
  try { form = await context.request.formData(); }
  catch { return json({error:'无法读取上传数据'}, {status:400}); }

  const file = form.get('file');
  if (!file || typeof file === 'string' || typeof file.stream !== 'function') return json({error:'没有收到图片文件'}, {status:400});
  if (!TYPES[file.type]) return json({error:'仅支持 JPG、PNG、WEBP、GIF、AVIF'}, {status:415});
  if (!file.size || file.size > MAX_BYTES) return json({error:'图片大小必须在 15 MB 以内'}, {status:413});

  const ext = TYPES[file.type];
  const id = crypto.randomUUID();
  const key = `gallery/${Date.now()}-${id}.${ext}`;
  try {
    const bytes = await file.arrayBuffer();
    await context.env.MEDIA.put(key, bytes, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000, immutable'
      },
      customMetadata: {
        originalName: String(file.name || 'upload').slice(0, 200)
      }
    });
    const url = '/media/' + key.split('/').map(encodeURIComponent).join('/');
    return json({ok:true,key,url,size:file.size,type:file.type});
  } catch (e) {
    return json({error:'写入 R2 失败'}, {status:500});
  }
}

export async function onRequestDelete(context) {
  if (!(await requireAdmin(context))) return json({error:'未登录或会话已过期'}, {status:401});
  if (!context.env.MEDIA) return json({error:'R2 尚未绑定'}, {status:503});
  const key = new URL(context.request.url).searchParams.get('key') || '';
  if (!key.startsWith('gallery/') || key.includes('..')) return json({error:'无效的图片 key'}, {status:400});
  try {
    await context.env.MEDIA.delete(key);
    return json({ok:true});
  } catch {
    return json({error:'删除 R2 图片失败'}, {status:500});
  }
}
