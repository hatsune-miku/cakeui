# npm 发布

包名为 `@a1knla/cakeui`，官方注册表为 https://registry.npmjs.org/ ，访问级别为 public。GitHub 仓库为 `hatsune-miku/cakeui`，npm author、Git author / committer 和标签 tagger 统一使用 `hatsune-miku`，Git 邮箱为 `20541974+hatsune-miku@users.noreply.github.com`。`package.json` 的 publishConfig 固定官方注册表和 public，锁文件中的下载地址也使用官方注册表。

首个版本 `0.1.0` 已发布。后续推荐使用 [Publish npm package 工作流](https://github.com/hatsune-miku/cakeui/actions/workflows/publish.yml)，源文件为 `.github/workflows/publish.yml`。它使用 npm Trusted Publishing，通过 GitHub OIDC 获取本次发布所需的临时身份，无需在 GitHub Secrets 中保存 npm token。

## 一次性配置 npm Trusted Publisher

在 npmjs.com 登录有权管理此包的账号，打开 `@a1knla/cakeui` 的 Settings → Trusted publishing → Add trusted publisher，选择 GitHub Actions，并填写：

| 配置项               | 本项目使用的值                                       |
| -------------------- | ---------------------------------------------------- |
| Organization or user | `hatsune-miku`，这是 GitHub 用户名，不是 npm scope   |
| Repository           | `cakeui`                                             |
| Workflow filename    | `publish.yml`，只填文件名，不带 `.github/workflows/` |
| Environment name     | 留空；本工作流未绑定 GitHub Environment              |
| Allowed actions      | 明确允许 `npm publish`，本工作流直接发布             |

按 2026-09-14 核对的 [npm 官方说明](https://docs.npmjs.com/trusted-publishers/)，2026-09-03 之后创建的配置默认允许 `npm stage publish`；仅保留默认值不够，需要额外允许 `npm publish`。名称和大小写必须准确。工作流文件本身不会创建 npm 侧的信任关系，手动验证成功也不能证明该配置已完成。

npm 当前要求 CLI 至少 11.5.1、Node 至少 22.14.0，且使用 GitHub 托管 runner。本项目固定 GitHub `ubuntu-24.04`、Node 24、npm 11.19.1；不要改为 Gallery 服务器上的 self-hosted runner。公共仓库发布公共包时自动附带 provenance，无需额外 token。`package.json.repository.url` 必须保持与仓库一致。

## 工作流的触发与检查

| 操作                                   | 行为                                            |
| -------------------------------------- | ----------------------------------------------- |
| 推送 `v<package.json.version>` tag     | 验证通过后，自动公开发布该版本                  |
| Actions 页面 Run workflow              | 只验证，生成可下载的 tgz；即使选择 tag 也不发布 |
| 普通分支 push、PR、GitHub Release 事件 | 不触发此发布工作流                              |

验证 job 只有 `contents: read`，不授予 OIDC 权限。依次检查包名、作者、仓库、public / registry、manifest 与锁文件版本、tag；运行文档一致性、类型、DOM 单元测试、发布保护测试、库 / Gallery 构建、格式、真实浏览器交互与 axe 检查；最后安装实际 tgz，验证 ESM、CSS / 声明入口、SSR、6 个文档示例及消费项目构建。

`npm run test:package -- --artifact-dir .cache/release` 在全部包验证通过后保留同一个 tgz，并写入包名、版本和 SHA-512 integrity。工作流执行发布 dry-run 后上传 `npm-package` artifact，保留 7 天。`package.tgz` 与 `metadata.json` 位于 artifact 内。

npm 11 即使在 dry-run 中也会拒绝已发布的版本，因此验证步骤同时使用 `--dry-run --force`，允许手动验证当前的 `0.1.0`。这一步不会写入 npm；真正发布不使用 `--force`，并在验证和发布两个 job 中检查目标版本尚不存在。

Windows PowerShell 本地使用此带参数命令时，写为 `npm.cmd run test:package -- --artifact-dir .cache/release`，避免 npm.ps1 丢失参数。GitHub runner 使用 Bash，无需此调整。

浏览器测试失败时，工作流另上传 `browser-failure` artifact，保留 7 天，包含错误上下文与 Playwright trace；可使用 `npx playwright show-trace <trace.zip>` 查看事件顺序。

只有 tag push 才会进入独立发布 job，并获得 `id-token: write`。它下载本次运行的 artifact，重新检查包信息、摘要和 npm 版本是否已存在，再执行 `npm publish <tgz> --ignore-scripts`。发布时不重新打包，也不执行包生命周期脚本。稳定版本使用 `latest`，带预发布后缀的版本使用 `next`；例如 `1.2.0-beta.1` 不会成为默认安装版本。版本不接受 `+build` 元数据，避免 npm 规范化后与 tag 产生歧义。

只有官方注册表返回 404 才允许发布；已存在的版本、权限错误、限流和网络异常都会中止。完成后再次比较官方注册表的 dist.integrity 与测试包的 SHA-512。npm 接受发布后可能仍在处理，发布后校验遇到 404 时每 10 秒读取一次，最多累计等待 5 分钟；仅重试读取，不重复发布，其他错误和摘要不匹配立即失败。所有 Actions 固定到完整提交 SHA，发布构建禁用包管理器缓存，进行中的发布不被新运行取消。

## 准备并发布新版本

1. 确认当前工作区，遵循 `AGENTS.md` 评估并更新 API 文档、README、发布说明与 Gallery 示例。所有安装和 import 使用带 scope 的包名，CSS 入口为 `@a1knla/cakeui/style.css`。
2. 在 package.json 与 package-lock.json 中同步设置尚未发布的版本，可以执行 `npm version <版本> --no-git-tag-version`。注册表已存在的版本不能覆盖，不删除重发。当前的 `0.1.0` 不能再用来测试发布。
3. 运行格式化、`npm run docs:build`、`npm run check`、`npm run test:package`、`npm run test:browser`。检查包内容只包含 package.json、README、dist 与 files 列出的文档。
4. 检查 Git author / committer 均使用 hatsune-miku，邮箱为 20541974+hatsune-miku@users.noreply.github.com；以此身份提交并推送经验证的改动，创建标签时也使用同一身份。
5. 首次接入时，可以先在 Actions 页面手动运行验证；确认 npm Trusted Publisher 已按上表配置，然后推送匹配的新版本 tag。

例如，只有在 package.json 和锁文件已经改为 `0.1.1`、文档已重建且提交通过验证后，才执行：

```sh
git tag -a v0.1.1 -m "Release 0.1.1"
git push origin v0.1.1
```

稳定版发布成功后，默认 `npm install @a1knla/cakeui` 会取得 `latest`；预发布版需明确安装 `@a1knla/cakeui@next` 或指定版本。不要为了验证工作流创建无意义的版本，手动运行已提供完整的发布前验证。

## 验证与故障处理

```sh
npm view @a1knla/cakeui version dist-tags dist.integrity --registry=https://registry.npmjs.org/
npm install @a1knla/cakeui --registry=https://registry.npmjs.org/
```

手动 dry-run 不会交换发布身份，OIDC 认证和 provenance 只能在 npm 侧配置完成后的真实发布中确认。不要添加 `npm whoami` 作为 CI 的身份检查，它不代表 `npm publish` 的 OIDC 认证结果。

若出现 ENEEDAUTH / E401 / E403，核对 npm 上的 GitHub 用户名、仓库名、`publish.yml`、Environment 留空、允许 `npm publish`，并确认发布 job 的 `id-token: write`、GitHub 托管 runner 与 npm 版本。不要用长期 npm token 掩盖信任配置错误。将来重命名工作流或添加 GitHub Environment 时，必须同步修改 npm 的信任配置与本文。

发布步骤或后续校验发生网络错误时，先查询目标版本是否已存在；若已存在且 integrity 与 artifact 一致，发布已经成功，不能盲目重新发布。若校验不一致，需要调查并使用新版本修复。

需要在本机手动发布时，仍可以通过 npm 官方网页登录完成认证后，运行 `npm publish --access public --registry=https://registry.npmjs.org/`；本机流程会执行 prepack 的文档检查和构建。遵循相同版本、验证与署名约定，按 npm 提示完成二次认证，不把密码、token 或 OTP 存入仓库。

发布 npm 包不会自动部署 Gallery。文档或示例有改动时，把 Gallery 与纯文本文档一起部署，见 [deployment.md](deployment.md)。使用 npm 镜像时若新版本尚未同步，可给安装命令追加官方 registry 参数。
