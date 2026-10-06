# 小青囊正式环境约定

## 已确认信息

- 正式域名：`xiaoqingnang.cn`
- 用户端：Web/H5，`https://xiaoqingnang.cn/`
- 内容后台：`https://xiaoqingnang.cn/admin/`
- 内容接口：`https://xiaoqingnang.cn/api/`
- 素材地址：`https://xiaoqingnang.cn/media/`

## 环境行为

- 正式网页、后台、API 与素材全部同源，不产生跨域依赖。
- 本机 H5 预览请求 `http://127.0.0.1:4173`。
- 数据库密码、支付密钥和服务器凭据只允许放在服务器环境变量中，不进入前端代码。

## Next.js 部署规则

- 统一执行 `npm run build && npm start`，使用 `.next/standalone` 生产服务。
- 前台、后台、`/api/` 与 `/media/` 均由同一个 Next.js 进程提供。
- SQLite 数据库和上传素材通过 `XQN_DATABASE_FILE` / `XQN_UPLOAD_DIR` 指向持久化目录。
- Nginx 只负责 HTTPS、gzip 或 brotli、静态缓存和反向代理，不再部署 HBuilderX 发行目录或独立静态后台。
- 使用 App Router 路由，服务器需将 `/admin/*`、`/article/*` 等路径转发到 Next 服务。

## 2026-09-03 部署状态

- H5、后台、API 与素材服务已经部署到 `115.191.35.3`。
- `xiaoqingnang.service` 已设为开机启动并正常运行。
- 每日自动备份已启用并完成首次备份，保留 14 天。
- Nginx HTTP 站点已通过语法检查和公网 Host 验收。
- 会员版 H5、后台、会员权限接口和数据库表已部署到服务器。
- Let's Encrypt 证书已签发并安装，覆盖根域名和 `www`，到期日为 2026-12-02；Nginx 内部 HTTPS、后台与会员接口验收通过。
- 公网 443 已放行，直接访问服务器可正常建立 HTTP/2；但域名仍被火山引擎的未备案策略拦截，HTTP 跳转到 `webblock.volcengine.com`，域名 SNI 的 TLS 连接被中止。
- 正式环境只允许通过 HTTPS 提交后台凭据、内容写入和会员激活。

## 尚未完成

- 域名备案放行；
- 证书当前使用手动 DNS 验证，需在 2026-11-03 左右续期，或配置 DNSPod API 后改为自动续期；
- 正式商户资料、订单和支付回调（当前仅开放内测会员码）；
- 微信内置浏览器、iOS Safari、安卓 Chrome 真机联调。

## 已准备的服务器文件

- `deploy/nginx-xiaoqingnang.conf`：同域名承载 H5、后台、接口和素材，并强制 HTTPS。
- `deploy/xiaoqingnang.service`：后台服务守护、自动重启及运行目录隔离。
- `deploy/xiaoqingnang-backup.timer`：每天备份 SQLite 数据库和上传素材，保留 14 天。

服务器接入后将项目代码放在 `/opt/xiaoqingnang`，将 Web 构建产物放在
`/var/www/xiaoqingnang/web`，将 `admin/` 放在 `/var/www/xiaoqingnang/admin`。
数据库与上传素材统一保存在 `/var/lib/xiaoqingnang`，不随代码更新被覆盖。
