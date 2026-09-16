import { useEffect, useRef, useState } from 'react'

import { ActionsDemo } from './components/ActionsDemo'
import { AiDocs } from './components/AiDocs'
import { ChoicesDemo } from './components/ChoicesDemo'
import { DataDemo } from './components/DataDemo'
import { DetailsDemo } from './components/DetailsDemo'
import { Example } from './components/Example'
import { FeedbackDemo } from './components/FeedbackDemo'
import { FormsDemo } from './components/FormsDemo'
import { Guide } from './components/Guide'
import { Icon, type IconName } from './components/Icon'
import { LogsDemo } from './components/LogsDemo'
import { NavigationDemo } from './components/NavigationDemo'
import { OverlaysDemo } from './components/OverlaysDemo'
import { Tokens } from './components/Tokens'

import { version } from '../../package.json'
import { Button, type CakeMode, CakeProvider, type CakeTheme, Dot, HoverTips, TextBox, Toast } from '../../src'

import './components/Icon/index.scss'
import './index.scss'

type Page = 'components' | 'example' | 'tokens' | 'guide' | 'docs'
type Category = 'all' | 'basic' | 'input' | 'navigation' | 'data' | 'feedback'
const nav: { page: Page; label: string; icon: IconName }[] = [
  { page: 'components', label: '组件总览', icon: 'grid' },
  { page: 'example', label: '应用示例', icon: 'layers' },
  { page: 'tokens', label: '设计变量', icon: 'palette' },
  { page: 'guide', label: '开始使用', icon: 'code' },
  { page: 'docs', label: 'AI 技术文档', icon: 'file' },
]
const categories: { id: Category; label: string }[] = [
  { id: 'all', label: '全部组件' },
  { id: 'basic', label: '基础' },
  { id: 'input', label: '输入' },
  { id: 'navigation', label: '导航' },
  { id: 'data', label: '数据展示' },
  { id: 'feedback', label: '反馈与浮层' },
]
function readPage(): Page {
  const page = new URLSearchParams(window.location.search).get('page')
  return nav.find((item) => item.page === page)?.page ?? 'components'
}
function readSettings() {
  try {
    const data = JSON.parse(localStorage.getItem('cakeui-demo-settings') ?? '{}')
    const themeChosen = data.themeChosen === true && ['pink', 'blue', 'gold'].includes(data.theme)
    return {
      theme: (themeChosen ? data.theme : 'blue') as CakeTheme,
      themeChosen,
      mode: (['light', 'dark', 'system'].includes(data.mode) ? data.mode : 'light') as CakeMode,
    }
  } catch {
    return { theme: 'blue' as CakeTheme, themeChosen: false, mode: 'light' as CakeMode }
  }
}
export function App() {
  const [settings, setSettings] = useState(readSettings)
  const [page, setPage] = useState<Page>(readPage)
  const [category, setCategory] = useState<Category>('all')
  const [query, setQuery] = useState('')
  const [compact, setCompact] = useState(false)
  const [sidebar, setSidebar] = useState(false)
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 700px)').matches)
  const sidebarElement = useRef<HTMLElement>(null)
  const [toast, setToast] = useState({ open: false, message: '', key: 0 })
  const search = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)')
    function update() {
      setMobile(media.matches)
    }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (!mobile || !sidebar) return
    const previous = document.activeElement as HTMLElement | null
    sidebarElement.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus()
    return () => previous?.focus()
  }, [mobile, sidebar])
  useEffect(() => {
    try {
      localStorage.setItem('cakeui-demo-settings', JSON.stringify(settings))
    } catch {
      /* Storage is optional in the playground. */
    }
  }, [settings])
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        search.current?.focus()
      }
      if (event.key === 'Escape') setSidebar(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  function navigate(next: Page) {
    const url = new URL(window.location.href)
    if (next === 'components') url.searchParams.delete('page')
    else url.searchParams.set('page', next)
    window.history.replaceState(null, '', url)
    setPage(next)
    setQuery('')
    setSidebar(false)
    window.scrollTo({ top: 0 })
  }
  function notify(message: string) {
    setToast((current) => ({ open: true, message, key: current.key + 1 }))
  }
  const sections = [
    { id: 'actions', category: 'basic', search: '按钮 提示 Button HoverTips WhatsThis', content: <ActionsDemo /> },
    {
      id: 'forms',
      category: 'input',
      search: '输入 表单 TextBox TextArea NumberBox ComboBox Field',
      content: <FormsDemo />,
    },
    {
      id: 'choices',
      category: 'input',
      search: '开关 选项 CheckBox Switch RadioButton Slider GroupBox',
      content: <ChoicesDemo />,
    },
    {
      id: 'navigation',
      category: 'navigation',
      search: '导航 标签页 Tabs TabList TabPanel Breadcrumb Pagination',
      content: <NavigationDemo />,
    },
    {
      id: 'feedback',
      category: 'feedback',
      search: '状态 反馈 Dot Tag Badge ProgressBar Spinner Skeleton Alert',
      content: <FeedbackDemo />,
    },
    {
      id: 'overlays',
      category: 'feedback',
      search: '浮层 菜单 Dialog ContextMenu MenuItem MenuSeparator Toast',
      content: <OverlaysDemo notify={notify} />,
    },
    {
      id: 'data',
      category: 'data',
      search: '列表 表格 Table TableHead TableBody TableRow TableHeader TableCell ListView ListItem Avatar Dot',
      content: <DataDemo />,
    },
    { id: 'logs', category: 'data', search: '日志 LogView LogEntry', content: <LogsDemo /> },
    {
      id: 'details',
      category: 'basic',
      search: '容器 折叠 Card Accordion AccordionItem Separator',
      content: <DetailsDemo />,
    },
  ]
  const filtered = sections.filter(
    (section) =>
      (category === 'all' || section.category === category) &&
      section.search.toLowerCase().includes(query.trim().toLowerCase())
  )
  return (
    <CakeProvider
      theme={settings.theme}
      mode={settings.mode}
      density={compact ? 'compact' : 'comfortable'}
      className="demo-app"
    >
      <a className="demo-skip" href="#main">
        跳转到内容
      </a>
      <aside
        ref={sidebarElement}
        inert={mobile && !sidebar}
        className="demo-sidebar"
        data-open={sidebar}
        aria-label="主导航"
        onKeyDown={(event) => {
          if (!mobile || !sidebar || event.key !== 'Tab') return
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button'))
          const first = items[0]
          const last = items.at(-1)
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }}
      >
        <a className="demo-brand" href="#main" onClick={() => navigate('components')}>
          <span className="demo-brand-mark">
            <Icon name="cake" size={22} />
          </span>
          <span>
            CakeUI<span className="demo-brand-version">{version}</span>
          </span>
        </a>
        <span className="demo-sidebar-caption">组件工作台</span>
        <nav className="demo-nav">
          {nav.map((item) => (
            <button
              type="button"
              key={item.page}
              className="demo-nav-item"
              aria-current={page === item.page ? 'page' : undefined}
              onClick={() => navigate(item.page)}
            >
              <Icon name={item.icon} size={17} />
              {item.label}
              {page === item.page && <span className="demo-nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="demo-sidebar-group">
          <span className="demo-sidebar-caption">组件索引</span>
          {categories.slice(1).map((item) => (
            <button
              type="button"
              className="demo-index-link"
              key={item.id}
              onClick={() => {
                navigate('components')
                setCategory(item.id)
              }}
            >
              {item.label}
              <Icon name="chevron" size={12} />
            </button>
          ))}
        </div>
        <div className="demo-sidebar-bottom">
          <div className="demo-sidebar-status">
            <span>React · TypeScript · SCSS</span>
          </div>
        </div>
      </aside>
      {sidebar && (
        <button
          className="demo-sidebar-backdrop"
          tabIndex={-1}
          aria-label="关闭导航"
          onClick={() => setSidebar(false)}
        />
      )}
      <div className="demo-workspace" inert={mobile && sidebar}>
        <header className="demo-topbar">
          <div className="demo-topbar-location">
            <Button
              className="demo-mobile-toggle"
              variant="ghost"
              aria-label="展开导航"
              aria-expanded={sidebar}
              onClick={() => setSidebar(!sidebar)}
            >
              <Icon name="menu" />
            </Button>
            <span className="demo-muted">工作台</span>
            <span className="demo-slash">/</span>
            <span>{nav.find((item) => item.page === page)?.label}</span>
          </div>
          <div className="demo-topbar-tools">
            <div className="demo-search">
              <Icon name="search" size={15} />
              <TextBox
                ref={search}
                aria-label="搜索组件"
                placeholder="搜索组件…"
                value={query}
                onChange={(event) => {
                  navigate('components')
                  setCategory('all')
                  setQuery(event.target.value)
                }}
              />
              <kbd className="demo-shortcut">⌘ K</kbd>
            </div>
            <HoverTips content="切换明暗模式">
              <Button
                variant="ghost"
                aria-label={settings.mode === 'dark' ? '切换浅色模式' : '切换深色模式'}
                onClick={() => setSettings({ ...settings, mode: settings.mode === 'dark' ? 'light' : 'dark' })}
              >
                <Icon name={settings.mode === 'dark' ? 'sun' : 'moon'} size={17} />
              </Button>
            </HoverTips>
          </div>
        </header>
        <main className="demo-main" id="main" tabIndex={-1}>
          <div className="demo-intro">
            <h1 className="demo-title">{nav.find((item) => item.page === page)?.label}</h1>
          </div>
          <div className="demo-controls">
            <div className="demo-row">
              <span className="demo-control-label">配色</span>
              <div className="demo-theme-options" role="group" aria-label="主题配色">
                {(
                  [
                    { theme: 'pink', label: '粉' },
                    { theme: 'blue', label: '蓝' },
                    { theme: 'gold', label: '金' },
                  ] as const
                ).map((item) => (
                  <button
                    className="demo-theme-button"
                    data-theme={item.theme}
                    aria-pressed={settings.theme === item.theme}
                    onClick={() => setSettings({ ...settings, theme: item.theme, themeChosen: true })}
                    key={item.theme}
                  >
                    <span className="demo-theme-swatch" />
                    {item.label}
                    {settings.theme === item.theme && <Icon name="check" size={12} />}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className="demo-density" aria-pressed={compact} onClick={() => setCompact(!compact)}>
              <Icon name="sliders" size={14} />
              {compact ? '紧凑间距' : '舒适间距'}
              <Icon name="chevron" size={11} />
            </button>
          </div>
          {page === 'components' && (
            <>
              <div className="demo-categories" role="group" aria-label="组件分类">
                {categories.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className="demo-category"
                    aria-pressed={category === item.id}
                    onClick={() => setCategory(item.id)}
                  >
                    {item.label}
                    {item.id === 'all' && <span className="demo-category-count">48</span>}
                  </button>
                ))}
              </div>
              <div className="demo-gallery">
                {filtered.map((section) => (
                  <div className="demo-gallery-item" data-wide={section.id === 'data'} key={section.id}>
                    {section.content}
                  </div>
                ))}
              </div>
              {!filtered.length && (
                <div className="demo-empty">
                  <Icon name="search" size={24} />
                  <p>没有找到「{query}」相关组件。</p>
                  <Button
                    onClick={() => {
                      setQuery('')
                      setCategory('all')
                    }}
                  >
                    查看全部组件
                  </Button>
                </div>
              )}
            </>
          )}
          {page === 'example' && <Example />}
          {page === 'tokens' && <Tokens />}
          {page === 'guide' && <Guide />}
          {page === 'docs' && <AiDocs />}
          <footer className="demo-footer">
            <a className="demo-link" href="https://github.com/hatsune-miku/cakeui">
              GitHub
            </a>
            <a className="demo-link" href="/?page=docs">
              AI 技术文档
            </a>
            <a className="demo-link" href="https://www.npmjs.com/package/@a1knla/cakeui">
              npm
            </a>
          </footer>
        </main>
      </div>
      <Toast
        key={toast.key}
        open={toast.open}
        onOpenChange={(open) => setToast((current) => ({ ...current, open }))}
        closeLabel="关闭通知"
      >
        <Dot tone="success" />
        {toast.message}
      </Toast>
    </CakeProvider>
  )
}
