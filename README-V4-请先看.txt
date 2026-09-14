LUMEN ARCHIVE / 光之战姬 官网 V4
===================================

V4 新增：Cloudflare R2 实时图片上传
-----------------------------------
管理员登录 /admin/ 后，可在「图库管理」中：
- 点击或拖入 JPG / PNG / WEBP / GIF / AVIF
- 填写标题、角色与标签
- 点击“上传并立即发布”
- 图片写入 Cloudflare R2
- 图片信息自动保存到 D1
- 官网 Gallery 无需重新部署即可立即出现新图片
- 后台可修改标题、标签、排序或删除图片

上传限制
--------
单张最大 15 MB。
为了安全，不接受 SVG。
通过后台上传的图片会作为官网 Gallery 的公开图片提供。

Cloudflare 一次性配置
---------------------
1. Cloudflare 左侧 Storage & databases -> R2 Object Storage。
2. Create bucket，建议名字：lumen-archive-media
3. 回到 Pages 项目 lumen-archive-site。
4. Settings -> Bindings -> Add -> R2 bucket。
5. Variable name 必须填写：MEDIA
6. R2 bucket 选择：lumen-archive-media
7. 保存后重新部署一次 Pages 项目。

已有的 D1 绑定保持：
DB -> lumen-archive-db

已有环境变量保持：
ADMIN_USERNAME
ADMIN_PASSWORD_SHA256
SESSION_SECRET

部署 V4
-------
把 V4 包中的文件上传/覆盖到 GitHub 仓库根目录，Commit 到 main。
Cloudflare Pages 自动部署成功后，再完成上面的 MEDIA R2 binding 并重新部署。

测试
----
登录：
https://你的域名/admin/

后台「概览」应显示：
内容数据库：D1 已连接
图片上传：R2 已连接

随后进入「图库管理」，上传一张测试图片。
发布成功后，直接刷新官网 Gallery 即可看到，不需要再次 GitHub Commit。

技术结构
--------
/api/media
  GET    检查 R2 binding
  POST   管理员上传图片
  DELETE 管理员删除图片对象

/media/*
  从 R2 同域名公开读取已发布图片

D1
  保存 Gallery 图片的标题、排序和 R2 URL/key

R2 binding
  MEDIA

D1 binding
  DB
