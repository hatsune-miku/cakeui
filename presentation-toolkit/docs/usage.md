# 使用与维护

## 工程组成

在演示工程中维护 `src/main.tsx`、按章节拆分的 TSX / JSON 内容、SCSS 和 `assets/`。本工具不规定页面数据格式，不替代 CakeUI 组件，也不包含任何业务报告资料。

配置 `presentation.config.json` 中的路径相对于配置文件；`--config path` 可指定其他配置。必填 `entry`、`outfile`、`title`；可选 `lang`（默认 zh-CN）、`description`、`minify`（默认 true）、`assets`（本地素材清单）、`editor`（结构化编辑配置）。未知字段会报错，输出必须为 `.html`。命令 `build` 构建并写出文件；`dev --port 4173` 仅监听本机，不自动发布。开发服务器不提供其他磁盘文件。`edit --port 4174` 启动可选编辑器，详见[配置与操作](editor.md)。

Node API：`buildPresentation(config, { cwd, write })` 返回 HTML、输出路径、字节数和输入清单；`write: false` 只返回内容。`definePresentation` 提供配置类型辅助，`loadConfig` 读取并验证 JSON。构建失败不会覆盖已有成品。

## 保存后自动刷新

运行 `cake-presentation dev` 后打开 `http://127.0.0.1:4173`。入口实际导入的 TS / TSX、JSON、CSS / SCSS（包括 Sass partial）、图片等资源变化时，工具自动重新构建，通过本机 SSE 通知所有预览标签页刷新。配置文件变化也会自动生效。短时间连续保存会合并构建；产物未改变时不会刷新。

这是整页 live reload，不是 React Fast Refresh：URL 中的 hash 保持不变，将页码写入 hash 的演示可以恢复当前页；组件内部的临时状态会重置。编译失败时保留上次成功的页面，浮层显示错误；修复并保存后自动恢复。初始源码或配置出错也可以在服务器运行时修复。连接中断后浏览器自动重连，收到更新版本时刷新。

预览仅在内存中构建，不修改配置中的 `outfile`。刷新脚本和错误浮层只注入开发预览响应，`build` 导出的自包含 HTML 不包含它们。终端按 Ctrl+C 关闭服务器和文件监听。修改 Toolkit 自身的源码后须重新运行其 `npm run build` 并重启预览。

## 离线资源

```tsx
import screenshot from './assets/screenshot.png'

import './style.scss'

export function Screenshot() {
  return <img className="screenshot" src={screenshot} alt="产品界面" />
}
```

支持 TS / TSX / JS / JSON、CSS / SCSS，以及 PNG、JPEG、GIF、WebP、AVIF、SVG、ICO、WOFF/WOFF2、TTF/OTF、MP4/WebM、MP3/WAV 的本地导入。SCSS 使用 Sass 编译。CSS `url()` 中的本地媒体也会内嵌。统一生成一个 IIFE 脚本和内联 CSS，双击 HTML 无需服务器。媒体越大，HTML 越大。

远程 import 和 CSS URL 在构建时拒绝。代码中手写 `fetch()`、动态计算的 URL、`<img src="https://...">` 或未导入的字符串路径不能由静态构建器可靠审查；交付前仍须断网检查。脚本运行时可能访问的接口不由工具镜像。媒体许可证由素材提供者维护，依赖的法律声明保留在产物中。

## 修改工具

`src/index.ts` 负责配置验证和原子输出，`src/bundle.ts` 共享资源打包与 HTML 组装逻辑；`src/cli.ts` 负责命令，`src/dev.ts` 与 `src/dev-client.ts` 负责监听、预览和浏览器刷新。运行 `npm test` 检查资源内嵌、HTML 边界、远程依赖拒绝、依赖修改通知、多客户端与重连、错误恢复，以及开发模式不写成品。修改组件行为时仍按 CakeUI 主仓库进行类型、浏览器与包验证。本工具不修改组件 API。

`src/assets.ts` 解析 `cake-presentation:assets` 虚拟导入。`src/editor/` 包含字段类型、编辑服务、原生 DOM 表单和 SCSS；构建会将编辑器样式放入 `dist/editor/`。编辑器通过 schema 接入不同报告，工具源码不包含公司报告内容。编辑器测试另覆盖草稿隔离、图片内嵌、备份、导出、冲突、路径与请求校验；报告级浏览器验收应在副本上完成。

输出无需复制 node_modules。长期复现需要保留源码、媒体、配置、package-lock.json 和使用的 CakeUI tgz。

## 播放导航与内容层级

示例使用 CakeUI presentation 的 `SlideNavigator` 与 `SlideDeck` 共享受控索引。数轴负责动画、相邻项、键盘焦点与打印；使用 `SlideDeck focusIndicator="none"` 可以隐藏整幅画布的焦点描边，同时保留文本选择与快捷键。播放方式菜单可使用 `SlidePlaybackMenu`，嵌入应用自己的菜单宿主。

这些显示能力属于 presentation 组件，不由打包器注入。应用可将数轴绑定到根节点，而将子页路径和侧栏说明放入 `context`。编辑器中 `parentId` 支持跨内容文件引用；根节点页数与包含子页的节点数分别统计，移动层级不要求更换页面 ID 或重写正文。

缩略图侧栏可用 `SlideTree` / `SlideTreeItem` 递归组合：children 表示真实父子关系，缩进与连接线展示层级，缩略图随层级逐渐变窄；折叠只改变目录显示，节点 onClick 负责更新应用页码。框架提供焦点移动、自动展开当前节点路径与内部滚动，报告无需将每一层拼成独立栏。

菜单中的字体、配色等二级选项可用 `SlideSubmenu` 包裹原生菜单项；组件处理悬停、点击、键盘进入 / 返回及屏幕边缘避让。宿主管理选择、持久化和整体关闭，并在方向键遍历时只选择属于当前 `role="menu"` 的条目。具体字体资源与许可由演示工程提供，打包器只负责内嵌本地资源。
