# CakeUI Presentation Toolkit

把 React / TypeScript / SCSS 演示工程构建为单个离线 HTML。提供开发预览，以及可选的结构化可视化编辑器；内容与素材保留为普通工程文件。

```sh
cd presentation-toolkit
npm ci
npm test
# 在演示工程内安装本目录，再创建 presentation.config.json
npm install /path/to/cakeui/presentation-toolkit
npx cake-presentation build
npx cake-presentation dev
# 配置 editor 后使用
npx cake-presentation edit
```

`dev` 保存后自动重新构建并刷新浏览器；编译错误会在预览中显示，修复后自动恢复。

`edit` 默认打开本机服务 `http://127.0.0.1:4174`：选择页面、编辑文字与列表、调整模板参数、上传图片、排序、复制、删除、撤销和导出。编辑器以实际应用渲染草稿，点击保存后才回写 JSON 与素材文件；旧内容自动备份。接入需要内容文件清单和字段 schema，见[编辑器配置](docs/editor.md)。

```json
{ "entry": "src/main.tsx", "outfile": "report.html", "title": "项目汇报", "lang": "zh-CN" }
```

React、React DOM 与 CakeUI 由演示工程安装，使用正常 `@a1knla/cakeui/presentation` 导入。尚未发布的 CakeUI 功能使用本地构建的 tgz，见[安装流程](../docs/ai.md#本地打包安装与离线文件)。本工具目前是本地独立工程，没有发布 npm 包。

[配置、资源与维护说明](docs/usage.md) · [TSX 起点](example/main.tsx)
