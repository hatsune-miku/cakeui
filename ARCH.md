# CakeUI

AI 友好、集成方便、结构简单、依赖干净、响应迅速的 UI 库，基于 React，适用于需要长期使用的软件系统。

# 背景

- 我在设计 CakeDesign UX Skill (https://raw.githubusercontent.com/hatsune-miku/cakedesign-skill/refs/heads/main/SKILL.md) 的时候，发现最终效果并不理想，我总是想多控制一些，但是我认为在 CD 这种指导文档中不应该引入太细致的要求。所以，我希望额外设计 CakeUI，用户可以搭配使用，可以更快地、更少轮次对话地得到更成熟的 UI 成果。

- 我想留下一些 CD 留下的优秀设计的影子，因此一个专门的 UI 库比较有必要。

- 现有的流行 UI 库，总是多少存在一些问题：

	- Ant Design，动画拖沓且线性，交互复杂，很多操作都需要多次点击
	- HeroUI，有着过于复杂的样式系统，且强依赖 Tailwind CSS
	- ElementPlus，使用率过高，辨识度降低

# 值得参考的项目和内容

- AnyDrop

仓库：C:\Users\guanz\projects\anydrop

值得参考：HoverTips, Button, Card, Dot, WhatsThis, LogView, TextBox, CheckBox

- KFC Client

仓库：C:\Users\guanz\projects\project-kfc\kfc-client

值得参考：自带的粉/蓝/金三套配色（值得直接内置），圆角数值，动画曲线，ContextMenu，ListView，阴影数值，字体选用、Tabs

- KVM

仓库：C:\Users\guanz\projects\kook-kvm

值得参考：ComboBox, Tag

- WalAssistantLark

仓库：C:\Users\guanz\projects\wal\wal-assistant-lark

值得参考：LogView

# 需求

按照以上的简短需求，以几乎 vibe 的形式先形成初版。

除了上述零件（HoverTips, Button等），你还需要用相同风格创造出常见 UI 库所具有的其它零件。

有以下额外注意事项：

- 不要创造类似于 ElementPlus 的 el-table 这种封装程度超高、需要用户直接提供特定格式数据的元素。

	CakeUI 的理想之一，就是极低的、接近于零的学习成本。这种 Table，我们提供最为简单的零件，用户和 AI 自然知晓如何拼装。
	
- 使用最为耳熟能详的命名。

	在这方面，微软是个好的参考对象，它的 Win32 原生组件名字具有极高的知名度，且含义清晰。

# 技术栈

- TypeScript + SCSS

# 编码规范

- 严格遵守 `C:\Users\guanz\.agents\样式和编码通常规则.md`
