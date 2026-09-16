# CakeUI 项目约定

## 文案

- README 保持简短，提供安装、最小示例和文档入口；完整 API 与维护流程放在对应文档。
- README、Gallery 和文档直接呈现功能、示例与用法，不写宣传标语、情绪化标题或无助于操作的铺垫。

## 每次修改都检查文档

- 开始修改前阅读 `docs/ai.md` 的相关部分，并以源码核对当前实现。
- 每次改动都判断是否影响公开 API、默认值、原生属性 / ref、DOM 结构、事件、键盘 / 焦点、主题 / 动效、兼容性、安装构建或部署。受影响时，同步更新 `docs/ai.md` 及相关 README、设计记录、部署说明和示例。
- 新增公开组件必须在 `docs/ai.md` 有同名 `### ComponentName` 章节，说明属性、默认值、结构、行为和限制。删除组件时同步删除相关文档。
- 纯内部重构等无需改正文的情况，在交付说明中明确“文档无需更新”及原因；不为满足流程制造无意义的文字改动。
- `public/llms.txt` 和 `public/llms-full.txt` 是生成结果，禁止手工维护。修改源文档 / 源码后运行格式化、`npm run docs:build`、`npm run docs:check`。源码内容指纹变化也需要重新生成，即使正文无需改变。
- `npm run check` 检查文档一致性；`npm run test:package` 检查 `example=` TSX 代码块能否通过真实安装包的类型检查。API 或示例变化时执行包验证。
- 发布 Gallery 时让文档与站点一起部署。验证 `/?page=docs`、`/llms.txt`、`/llms-full.txt`；纯文本应为 UTF-8 text/plain，缺失文件不能返回 SPA HTML。
- 自动提取类型和变量不能代替语义审查；交付前检查说明是否与实际行为一致。

## 开发与署名

- 先阅读 `ARCH.md`，沿用 TypeScript + SCSS、原生属性、JSX 组合的设计，不凭其他库习惯发明 API。
- 具名函数用 function，匿名回调用箭头函数；组件采用 `Foo/index.tsx` 与 `Foo/index.scss`。
- 样式使用完整 className，禁止 BEM、`&-suffix` 拼接和给匿名后代标签挂样式；布局优先 flex / grid。
- 禁止使用 worktree。默认在当前分支工作，慎重创建新分支，除非用户要求，不创建新分支。
- 本项目公开署名统一使用 GitHub 账号名 `hatsune-miku`，包括 Git author / committer、标签 tagger、npm author、文档和演示中的维护者名称。commit / push 前检查仓库本地 Git 配置；邮箱使用 `20541974+hatsune-miku@users.noreply.github.com`。不添加 AI / Codex 署名或 Co-Authored-By。
- 每个对话第一次执行 git commit 前告知用户。已授权的后续提交与部署无需重复询问。
- 不在代码、文档、日志或提交中保存部署凭据。
