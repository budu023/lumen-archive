# LUMEN ARCHIVE 私人文档功能

这套补丁复用现有的管理员账号和 D1，并使用**独立的 R2 bucket** 保存私人文档。

## 部署

1. 把补丁中的文件加入/覆盖到仓库。
2. 在现有 D1 数据库执行 `schema-private-docs.sql`。
3. 在 Cloudflare Pages → Settings → Bindings → R2 中新增一个私人 bucket：
   - 建议名称：`lumen-archive-private`
   - Variable name：`PRIVATE_MEDIA`
4. **不要给这个私人 bucket 开启 R2 Public Bucket / 公共自定义域名。**
5. Cloudflare Pages 重新部署。

现有公开 Gallery 继续使用原来的 `MEDIA` bucket，不受影响。

## 使用

- `https://你的域名/private/`：账号密码登录后查看私人文档，也可以上传/删除文档。
- 文档实际通过 `/docs/*` 读取，每次读取都会验证 `lumen_admin` Session。
- 使用的账号密码就是现有 `/admin/` 的 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD_SHA256`。

## 安全说明

私人文档不会放进 GitHub，也不会作为 Pages 静态文件提供。
文档存储在独立 R2 bucket 的 `private-docs/` 前缀下。
即使别人知道文件名，访问 `/docs/*` 也必须先通过现有管理员 Session。
