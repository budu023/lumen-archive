# LUMEN ARCHIVE — 私人文档版

这是在原 LUMEN ARCHIVE 基础上加入的私人文档功能版本。

## 新增功能

- `/private/` 私人文档管理页
- 复用现有管理员账号密码登录
- 登录后才能查看文档列表
- 上传、打开、下载、删除文档
- 文档存储在独立的 Cloudflare R2 bucket
- 私人 R2 不需要公开访问
- `/docs/*` 每次请求都会验证管理员 Session
- 原来的 Gallery / 图片功能保留

## Cloudflare 部署

### 1. D1

本版本已经把私人文档表合并进 `schema.sql`。

执行一次：

```sql
CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS private_documents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_private_documents_created_at
ON private_documents(created_at DESC);
```

如果你已经执行过原来的 `schema.sql`，再次执行也不会破坏已有数据。

### 2. R2

创建一个新的、不要公开访问的 R2 bucket，例如：

`lumen-archive-private`

在 Cloudflare Pages 项目：

`Settings → Functions → Bindings → R2 bucket`

添加：

- Variable name: `PRIVATE_MEDIA`
- R2 bucket: `lumen-archive-private`

原来的公开图片 R2 `MEDIA` 保持不变。

### 3. 环境变量

继续使用原来的：

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_SHA256`
- `SESSION_SECRET`

私人文档直接复用这个管理员账号。

### 4. 访问

部署后打开：

`https://你的域名/private/`

输入管理员账号密码即可进入。

## 支持的文件

默认支持：

- PDF
- TXT / Markdown / RTF
- DOC / DOCX
- XLS / XLSX
- PPT / PPTX
- ZIP / 7Z / RAR

单文件上限为 100 MB。

## 重要

不要给 `lumen-archive-private` 开启 R2 Public Access。

私人文件的访问路径是：

`/docs/<文件名>`

它会先检查 `lumen_admin` Session；没有有效登录会直接返回 401。

## GitHub

这个 ZIP 是完整项目，不是补丁。解压后，里面的内容就是可以直接放进 GitHub 仓库根目录的完整项目文件。
