# CakeUI Native

React Native 基础组件，使用 AnyDrop 的粉色主题。源码入口由 Metro 编译，不依赖 React DOM 或 CSS。

```tsx
import { Button, CakeProvider, Card, TextBox } from '@a1knla/cakeui-native'

export function Example() {
  return (
    <CakeProvider mode="system">
      <Card>
        <TextBox accessibilityLabel="名称" />
        <Button onPress={() => {}}>确认</Button>
      </Card>
    </CakeProvider>
  )
}
```

公开组件：CakeProvider、Button、Card、TextBox、CheckBox、Switch、ProgressBar、Spinner、Separator、Dialog。`useCakeTheme()` 返回 `colors` 和 `dark`，供应用布局使用。

Provider 的 mode 为 light / dark / system，默认 system；当前只有 AnyDrop 粉色主题。Button 沿用 RN onPress / disabled，variant 为 default / primary / ghost / danger，loading 禁用操作。Card padding 默认 medium，可设 none。TextBox 沿用 value / onChangeText，invalid 显示错误描边。CheckBox 使用 checked / onValueChange；Switch 保留 RN value / onValueChange。ProgressBar 的 value 为 0–1，非法值显示 0。Dialog 使用 visible / onRequestClose，title 必填；调用者提供关闭操作和内容。Spinner / Separator 分别保留 ActivityIndicator / View 属性。

颜色由 Web CakeProvider mixins 生成：在仓库根运行 `npm run native:tokens`，再用 `npm run native:tokens:check` 校验。不要手动修改 src/tokens.ts。RN 使用原生 StyleSheet，触摸尺寸按手机适配，不复刻桌面 32px 点击框。

此包初期仅通过本地 tarball 接入 AnyDrop；尚未发布 npm。平台系统 Widget 使用各自原生视图，不直接渲染 React Native 组件。
