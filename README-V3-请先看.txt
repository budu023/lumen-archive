光之战姬官网 V3
================

这版新增
--------
1. 恢复官网「UPDATES / 更新日志」栏目。
2. 新增 /admin 管理员后台界面。
3. 管理员可编辑：
   - 首页文字
   - 蕾蕾 / 冰刃零角色简介
   - 世界观总述
   - Gallery 图片标题
   - 更新日志（新增 / 编辑 / 删除）
   - X 账号与链接
4. 增加 JSON 导入 / 导出备份。
5. 增加 Cloudflare Pages Functions + D1 的后端代码骨架。
6. 管理员密码不会写在前端源码里；部署后由服务端验证。

本地预览
--------
直接双击 index.html 可以查看官网。

管理员后台：
双击 admin/index.html。

因为本地文件没有服务器，所以本地后台会显示「LOCAL DEMO」。
你可以预览后台、修改字段并导出 JSON，但这些修改不会自动发布给其他人。
这是刻意设计的，避免做成假的前端密码保护。

真正在线管理员模式
------------------
部署到 Cloudflare Pages 后：
- Pages：官网前端
- Pages Functions：登录与保存 API
- D1：保存网站文字 / 更新日志
- R2：V4 再接，用于管理员直接上传图片

需要配置 3 个服务端变量：
- ADMIN_USERNAME
- ADMIN_PASSWORD_SHA256
- SESSION_SECRET

生成密码哈希和随机 SESSION_SECRET：
  node scripts/hash-password.mjs "你的管理员密码"

然后创建 D1 数据库，执行 schema.sql，并把 D1 binding 命名为：DB

注意
----
- 不要把明文密码写进 index.html、admin.js 或 GitHub 仓库。
- V3 的图片仍然是静态文件；后台「直接上传新图」会在接入 Cloudflare R2 后实现。
- site-data.js 是网站的默认内容。当 D1 没有数据或本地双击预览时，会使用这里的默认值。

目录重点
--------
index.html               官网
site-data.js             默认内容
admin/index.html         管理员后台
admin/admin.js           后台逻辑
functions/api/login.js   登录 API
functions/api/content.js 内容读取 / 保存 API
schema.sql               D1 表结构
scripts/hash-password.mjs 密码哈希工具
