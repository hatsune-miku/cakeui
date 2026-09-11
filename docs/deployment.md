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
