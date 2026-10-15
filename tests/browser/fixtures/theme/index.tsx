import { type CSSProperties, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'

import {
  Button,
  CakeProvider,
  Card,
  CheckBox,
  ComboBox,
  Dialog,
  RadioButton,
  Switch,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  TextArea,
  TextBox,
  ThemeSettings,
} from '../../../../src'
import { Slide, SlideDeck, SlideHeader, SlidePanel } from '../../../../src/presentation'
import {
  type ThemeConfig,
  type ThemeStorageAdapter,
  createThemeConfig,
  normalizeThemeColor,
  resolveThemeOptions,
  serializeThemeConfig,
  themePresets,
  updateThemeConfig,
} from '../../../../src/theme'

import '../../../../src/presentation/styles.scss'
import '../../../../src/styles.scss'
import './index.scss'

function Fixture() {
  const [config, setConfig] = useState(() => createThemeConfig({ mode: 'light' }))
  const [rename, setRename] = useState(false)
  const [fail, setFail] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState('')
  const storage = useMemo<ThemeStorageAdapter>(
    () => ({
      load: () => localStorage.getItem('cake-theme-fixture'),
      save: async (value) => {
        setAttempts((count) => count + 1)
        if (fail) throw new Error('Storage unavailable')
        localStorage.setItem('cake-theme-fixture', serializeThemeConfig(value))
      },
    }),
    [fail]
  )
  const options = resolveThemeOptions(config)
  function change(patch: Parameters<typeof updateThemeConfig>[1]) {
    setConfig(updateThemeConfig(config, patch))
  }
  return (
    <CakeProvider
      className="theme-fixture"
      data-testid="scope"
      config={config}
      onThemeChange={setConfig}
      style={{ '--business-spacing': '19px' } as CSSProperties}
    >
      <div className="theme-fixture-controls">
        <label>
          Preset
          <ComboBox
            aria-label="Preset"
            value={config.scheme}
            onChange={(event) => change({ scheme: event.currentTarget.value as ThemeConfig['scheme'] })}
          >
            {themePresets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id}
              </option>
            ))}
            <option value="custom">custom</option>
          </ComboBox>
        </label>
        <label>
          Mode
          <ComboBox
            aria-label="Mode"
            value={options.mode}
            onChange={(event) => change({ mode: event.currentTarget.value as typeof options.mode })}
          >
            {['light', 'dark', 'system'].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </ComboBox>
        </label>
        <label>
          Foreground
          <ComboBox
            aria-label="Foreground"
            value={options.foreground}
            onChange={(event) => change({ foreground: event.currentTarget.value as typeof options.foreground })}
          >
            {['auto', 'light', 'dark'].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </ComboBox>
        </label>
        <TextBox
          aria-label="Accent source"
          value={config.customColor}
          onChange={(event) => {
            const color = normalizeThemeColor(event.currentTarget.value)
            if (color) change({ customColor: color })
          }}
        />
      </div>
      <div className="theme-fixture-actions">
        <ThemeSettings storage={storage} onStorageError={(_, operation) => setError(operation)} />
        <Button onClick={() => setRename(true)}>Rename</Button>
        <CheckBox checked={fail} onChange={(event) => setFail(event.currentTarget.checked)}>
          Fail saving
        </CheckBox>
      </div>
      <Card data-testid="card">
        <div className="theme-fixture-actions">
          <Button>Default</Button>
          <Button variant="primary" data-testid="primary">
            Primary
          </Button>
          <Button variant="primary" disabled data-testid="disabled">
            Disabled
          </Button>
          <Button variant="danger">Danger</Button>
        </div>
        <TextBox aria-label="Name" placeholder="Placeholder" />
        <TextArea aria-label="Description" />
        <ComboBox aria-label="Choice">
          <option>One</option>
          <option>Two</option>
        </ComboBox>
        <ComboBox searchable aria-label="Searchable choice">
          <option>One</option>
          <option>Two</option>
        </ComboBox>
        <div className="theme-fixture-actions">
          <CheckBox defaultChecked>Check</CheckBox>
          <RadioButton defaultChecked name="sample">
            Radio
          </RadioButton>
          <Switch defaultChecked>Switch</Switch>
        </div>
        <Tabs defaultValue="first">
          <TabList>
            <Tab value="first">First</Tab>
            <Tab value="second">Second</Tab>
          </TabList>
          <TabPanel value="first">First content</TabPanel>
          <TabPanel value="second">Second content</TabPanel>
        </Tabs>
      </Card>
      <CakeProvider data-testid="nested">
        <Button variant="primary">Nested primary</Button>
      </CakeProvider>
      <SlideDeck config={config} controls={false} aria-label="Themed slides">
        <Slide tone="inverted">
          <SlideHeader title="Theme preview" />
          <SlidePanel data-testid="inverted-panel">Surface</SlidePanel>
          <SlidePanel variant="accent" data-testid="inverted-accent-panel">
            Accent surface
          </SlidePanel>
        </Slide>
      </SlideDeck>
      <output data-testid="attempts">{attempts}</output>
      <output data-testid="error">{error}</output>
      <Dialog
        title="Rename document"
        open={rename}
        onOpenChange={setRename}
        footer={<Button onClick={() => setRename(false)}>Done</Button>}
      >
        <TextBox aria-label="Document name" placeholder="Document.md" />
      </Dialog>
    </CakeProvider>
  )
}
createRoot(document.getElementById('root')!).render(<Fixture />)
