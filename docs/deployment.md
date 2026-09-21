# Gallery 部署

公开地址：https://gallery.vanillacake.cn 。服务器为 `miku@vanillacake.cn`，使用现有 Nginx 提供静态工作台，证书由 Certbot / Let's Encrypt 签发。

## 更新

在 Windows PowerShell 中运行：

```powershell
./scripts/deploy-gallery.ps1
```

脚本构建 `demo-dist`，通过 SSH 上传到独立版本目录并原子切换 `current`。如果本轮已构建且源码没有变化，可传 `-SkipBuild`。远端 sudo 按需询问密码；凭据不写入文件。

部署前运行 `npm run check` 和 `npm run test:browser`。第一次上线会先添加 HTTP 站点，使用 webroot 完成证书验证，再启用 HTTPS 和 HTTP 跳转。现有其他 Nginx 站点配置保持独立。

- 发布目录：`/var/www/cakeui-gallery/releases/<UTC 时间戳>`
- 当前版本：`/var/www/cakeui-gallery/current`
- 历史哈希资源：`/var/www/cakeui-gallery/assets`，保留旧页面所引用的资源
- Nginx 配置：`/etc/nginx/sites-available/cakeui-gallery`
- 证书：`/etc/letsencrypt/live/gallery.vanillacake.cn/`
- 日志：`/var/log/nginx/cakeui-gallery.access.log` 和 `cakeui-gallery.error.log`

HTML 每次重新验证缓存；带哈希的资源长期缓存。工作台无需 Node.js 常驻服务，运行时不提供后端或收集业务数据。

构建包含 Gallery 的 `index.html` 与独立 HTML 幻灯片 `slides.html`。`/?page=presentation` 在 Gallery 内预览，`/slides.html` 只加载幻灯片样式并提供全屏、连续阅读和打印 / PDF。部署时同时包含 `presentation-layout.svg` 示例图片与两个 HTML 入口引用的哈希资源；上线后检查两个入口及图片均可访问。独立页的打印样式设置 A4 横向，库样式本身不设置全局纸张。

## 浏览器 JS / CSS 分发

固定目录为 `/var/www/html/cakeui-dist`，由现有 `vanillacake.cn` HTTPS 站点提供：

- 默认 JS：`https://vanillacake.cn/cakeui-dist/cakeui.min.js`
- 默认 CSS：`https://vanillacake.cn/cakeui-dist/cakeui.css`
- 当前来源与摘要：`https://vanillacake.cn/cakeui-dist/manifest.json`
- 固定 npm 版本：`https://vanillacake.cn/cakeui-dist/releases/<版本>/cakeui.min.js`，CSS 同目录。
- 预发布通道：`https://vanillacake.cn/cakeui-dist/next/`，引用时追加文件名。
- 普通 script 示例：`https://gallery.vanillacake.cn/browser.html`，HTML 本身不需要本地构建。

每次 npm 发布成功后，`publish.yml` 自动上传已验证 tgz 中的 `dist/browser/cakeui.min.js` 和 `dist/browser/cakeui.css`。不直接上传 `dist/index.js` 或 `dist/presentation/index.js`，它们仍是外置 React 的 ESM。

初始化由 `deploy/install-browser.sh <上传目录>` 完成，上传目录必须位于 `/home/miku/.cache/cakeui-browser-setup/` 下，并包含接收器、Nginx snippet 和专用 `deploy-key.pub`。脚本需要一次 sudo，将 root 所有的接收器安装到 `/usr/local/libexec/cakeui-dist-receive`，使 miku 可写指定分发目录，并添加带 forced command 的部署公钥；保留其他 authorized_keys。Nginx 主站仅增加 `/cakeui-dist/` location，配置检查通过后重载，资源返回正确 MIME、`Access-Control-Allow-Origin: *` 与 no-cache；缺失资源返回 404。已有主站证书沿用现有 Certbot 配置。

接收器仅接受明确的两个文件名，校验版本格式、体积和 SHA-256，将版本目录完整落盘后原子切换 current / next 软链接。根目录的两个文件链接到 current；固定版本目录不覆盖，重复部署相同产物可重试。preview 可初始化空目录，但不会覆盖 npm 稳定版。当前 bootstrap 的 manifest.source 为 preview，直到下一次稳定 npm 发布。

本机使用免密 SSH 运行 `npm.cmd run deploy:browser -- --artifact-dir <已发布artifact目录>`；日常自动化使用 Actions Secrets 中专用密钥，无需 sudo 或账户密码。只需要检查连接时运行 `npm run deploy:browser -- --check`。Linux 接收器的验证命令为 `python3 -m unittest discover -s tests -p browser_receiver_test.py`，在 Ubuntu 执行；Windows 本机的原子软链接替换行为不作为服务端兼容目标。

## AI 技术文档

- 阅读页：[Gallery AI 技术文档](https://gallery.vanillacake.cn/?page=docs)
- 完整纯文本：[llms-full.txt](https://gallery.vanillacake.cn/llms-full.txt)
- 简短索引：[llms.txt](https://gallery.vanillacake.cn/llms.txt)

正文在 `docs/ai.md` 维护。运行 `npm run docs:build` 从正文、公开类型与主题 SCSS 生成 `public/llms.txt` 和 `public/llms-full.txt`，`npm run docs:check` 检查内容是否一致以及公开组件是否遗漏。`build:demo` 在构建前检查，Vite 将生成文件复制到 `demo-dist`。`-SkipBuild` 也会检查文档与构建目录是否一致，避免上线旧文档。

Nginx 为 `/llms.txt` 与 `/llms-*.txt` 使用专门的静态文件规则，响应 `Content-Type: text/plain; charset=utf-8` 与 `Cache-Control: no-cache`，缺失文件返回 404，不回退到 SPA HTML。客户端无需登录或执行 JavaScript，即可 GET 完整文档。阅读页加载同一个全文文件，库 API、站点与文档按同一发布目录切换。

本地 Vite 开发和 preview 同样通过文档中间件声明 UTF-8 与纯文本类型，避免浏览器在无 JavaScript 页面中猜测错误编码。开发读取 `public`，preview 读取所构建的输出目录；缺失文档也返回 404。

远端安装脚本检查两个文档存在，部署后核对 HTTPS 内容、Content-Type 和缺失文档的 404。Nginx 平滑重载可能短暂由旧 worker 响应，文档就绪检查最多尝试 5 次、间隔 1 秒，核对响应头与内容字节，而不只接受 HTTP 200；持续失败则回退。对外验证可执行：

```sh
curl -I https://gallery.vanillacake.cn/llms-full.txt
curl --fail https://gallery.vanillacake.cn/llms.txt
curl -I https://gallery.vanillacake.cn/llms-missing.txt
```

后续每次改动都按 `AGENTS.md` 判断是否影响文档。类型与变量可以自动提取，交互语义、默认值和示例仍需人工核对。修改 API 或示例后运行 `npm run test:package`，会在真实 tgz 消费项目中检查文档 TSX 示例与生成的公开类型附录。

## 证书续期

复用服务器已启用的 `snap.certbot.renew.timer`。证书使用可自动续期的 webroot 验证，成功后检查并重新加载 Nginx。验证单个站点的续期：

```sh
sudo certbot renew --cert-name gallery.vanillacake.cn --dry-run --run-deploy-hooks
systemctl list-timers snap.certbot.renew.timer
```

HTTP 的 `/.well-known/acme-challenge/` 始终保留为验证入口，其余 HTTP 请求跳转 HTTPS。

## 回退

在远端选取 `releases` 下已有的版本，用其完整路径替换下方时间戳：

```sh
sudo ln -s /var/www/cakeui-gallery/releases/<UTC 时间戳> /var/www/cakeui-gallery/current.rollback
sudo mv -Tf /var/www/cakeui-gallery/current.rollback /var/www/cakeui-gallery/current
```

静态版本切换不需要重启 Nginx。更改站点配置时，先执行 `sudo nginx -t`，再执行 `sudo systemctl reload nginx`。
