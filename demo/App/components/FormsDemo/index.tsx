import { useState } from 'react'

import { ComboBox, Field, NumberBox, TextArea, TextBox } from '../../../../src'
import { Section } from '../Section'

export function FormsDemo() {
  const [name, setName] = useState('我的工作空间')
  return (
    <Section
      id="forms"
      title="输入与选择"
      subtitle="TextBox · ComboBox · NumberBox · TextArea"
      code={
        '<Field label="名称" htmlFor="name">\n  <TextBox id="name" name="name" defaultValue="工作空间" />\n</Field>\n<ComboBox aria-label="同步频率" defaultValue="auto">\n  <option value="auto">自动同步</option>\n  <option value="manual">手动同步</option>\n</ComboBox>'
      }
    >
      <Field label="工作空间名称" htmlFor="workspace-name">
        <TextBox
          id="workspace-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="输入名称"
        />
      </Field>
      <div className="demo-form-grid">
        <Field label="同步方式" htmlFor="sync-method">
          <ComboBox id="sync-method" defaultValue="auto">
            <option value="auto">自动同步</option>
            <option value="manual">手动同步</option>
            <option value="wifi">仅 Wi-Fi</option>
          </ComboBox>
        </Field>
        <Field label="保留版本" htmlFor="versions">
          <NumberBox id="versions" min={1} max={99} defaultValue={10} />
        </Field>
      </div>
      <Field label="模型提供方" htmlFor="model-provider">
        <ComboBox
          id="model-provider"
          searchable
          searchPlaceholder="搜索提供方…"
          emptyText="没有匹配的提供方"
          defaultValue=""
        >
          <option value="">选择模型提供方</option>
          <optgroup label="云服务">
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="google">Google</option>
          </optgroup>
          <optgroup label="本地服务">
            <option value="ollama">Ollama</option>
            <option value="lmstudio">LM Studio</option>
          </optgroup>
          <option value="unavailable" disabled>
            暂不可用
          </option>
        </ComboBox>
      </Field>
      <Field label="备注" htmlFor="notes">
        <TextArea id="notes" rows={2} placeholder="输入备注" />
      </Field>
    </Section>
  )
}
