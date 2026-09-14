# npm 发布

包名为 `@a1knla/cakeui`，发布到 https://registry.npmjs.org/ ，使用 public 访问级别。GitHub 仓库仍为 `hatsune-miku/cakeui`，作者与 Git 提交署名使用 `miku`。`package.json` 的 publishConfig 固定官方注册表和 public，避免本机镜像或默认私有 scope 配置影响发布。

## 准备新版本

1. 确认当前工作区，遵循 `AGENTS.md` 评估并更新 API 文档、README 与 Gallery 示例。所有安装和 import 使用带 scope 的包名，CSS 入口为 `@a1knla/cakeui/style.css`。
2. 在 package.json 与 package-lock.json 中同步设置尚未发布的版本。注册表已存在的同一名称 / 版本不能覆盖，不通过删除重发修补版本。
3. 运行格式化、`npm run docs:build`、`npm run check` 与 `npm run test:package`。影响交互或 Gallery 时，再运行 `npm run test:browser`。
4. 检查 `npm pack --dry-run --json` 的文件清单，只发布 package.json、README、dist 与 files 列出的文档，不携带凭据、测试输出或本地缓存。
5. 以 miku 署名提交经验证的改动，确保 GitHub 与发布内容对应。

## 发布

```sh
npm whoami --registry=https://registry.npmjs.org/
# 仅登录失效时执行，并在 npm 官方页面完成认证
npm login --registry=https://registry.npmjs.org/ --auth-type=web

# 在 CakeUI 根目录执行；prepack 会校验文档并重新构建
npm publish --access public --registry=https://registry.npmjs.org/
```

账号必须有权向 @a1knla scope 发布。npm 要求的二次认证按官方流程完成，不将密码、token 或 OTP 存入仓库或发布脚本。不要把服务端 sudo 凭据用于 npm。

发布完成后用官方注册表查询版本、维护者和 dist.integrity，再从注册表安装到独立消费目录，验证公开导出与 CSS / 类型入口。遇到不确定的网络结果，先查询该版本是否已经存在，不盲目重复发布。

```sh
npm view @a1knla/cakeui version dist-tags dist.integrity --registry=https://registry.npmjs.org/
npm install @a1knla/cakeui --registry=https://registry.npmjs.org/
```

将更新后的 Gallery 和纯文本文档一起部署，流程见 [deployment.md](deployment.md)。使用 npm 镜像时若新版本尚未同步，可给安装命令追加上述官方 registry 参数。
