import { createRef } from 'react'
import { renderToString } from 'react-dom/server'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  Button,
  CakeProvider,
  CheckBox,
  ComboBox,
  LogEntry,
  LogView,
  NumberBox,
  Pagination,
  RadioButton,
  Switch,
  Tab,
  TabList,
  TabPanel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TextArea,
  TextBox,
  Toast,
} from '../src'

afterEach(() => vi.useRealTimers())

describe('native contracts', () => {
  it('preserves refs, native form values, validation, and user classes', async () => {
    const ref = createRef<HTMLInputElement>()
    const user = userEvent.setup()
    render(
      <form aria-label="settings">
        <TextBox aria-label="name" name="name" defaultValue="gz" ref={ref} className="custom" required />
        <NumberBox name="copies" aria-label="copies" defaultValue={3} />
        <ComboBox aria-label="quality" name="quality" defaultValue="high">
          <option value="high">High</option>
          <option value="low">Low</option>
        </ComboBox>
        <CheckBox name="notice" defaultChecked>
          Notice
        </CheckBox>
        <Switch name="sync" defaultChecked>
          Sync
        </Switch>
        <RadioButton name="theme" value="pink" defaultChecked>
          Pink
        </RadioButton>
        <TextArea name="notes" aria-label="notes" defaultValue="hello" />
      </form>
    )
    expect(ref.current).toBe(screen.getByLabelText('name'))
    expect(ref.current).toHaveClass('custom', 'cake-textbox')
    await user.selectOptions(screen.getByLabelText('quality'), 'low')
    const data = new FormData(screen.getByRole('form') as HTMLFormElement)
    expect(Object.fromEntries(data)).toEqual({
      name: 'gz',
      copies: '3',
      quality: 'low',
      notice: 'on',
      sync: 'on',
      theme: 'pink',
      notes: 'hello',
    })
    await user.clear(screen.getByLabelText('name'))
    expect(ref.current?.checkValidity()).toBe(false)
  })

  it('styles grouped combo options while preserving refs, disabled state, and form reset', async () => {
    const ref = createRef<HTMLSelectElement>()
    const change = vi.fn()
    const user = userEvent.setup()
    render(
      <form aria-label="grouped settings">
        <ComboBox ref={ref} name="quality" aria-label="quality" defaultValue="high" onChange={change}>
          <>
            <optgroup label="Available" className="custom-group">
              <option value="high" className="custom-option">
                High
              </option>
              <option value="low">Low</option>
            </optgroup>
            <optgroup label="Unavailable" disabled>
              <option value="locked">Locked</option>
            </optgroup>
          </>
        </ComboBox>
        <Button type="reset">Reset</Button>
      </form>
    )
    expect(ref.current).toBe(screen.getByRole('combobox'))
    expect(screen.getByRole('group', { name: 'Available' })).toHaveClass('cake-combobox-group', 'custom-group')
    expect(screen.getByRole('option', { name: 'High' })).toHaveClass('cake-combobox-option', 'custom-option')
    expect(screen.getByRole('option', { name: 'Locked' })).toBeDisabled()
    await user.selectOptions(ref.current!, 'low')
    expect(change).toHaveBeenCalledTimes(1)
    expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('quality')).toBe('low')
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(ref.current).toHaveValue('high')
  })

  it('does not accidentally submit and blocks repeated loading actions', async () => {
    const submit = vi.fn((event) => event.preventDefault())
    const click = vi.fn()
    render(
      <form onSubmit={submit}>
        <Button onClick={click}>Normal</Button>
        <Button loading onClick={click}>
          Saving
        </Button>
        <Button type="submit">Submit</Button>
      </form>
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Normal' }))
    await user.click(screen.getByRole('button', { name: 'Saving' }))
    expect(click).toHaveBeenCalledTimes(1)
    expect(submit).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Submit' }))
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('updates mixed checkbox state and forwards its ref', () => {
    const ref = createRef<HTMLInputElement>()
    const { rerender } = render(
      <CheckBox ref={ref} indeterminate>
        All
      </CheckBox>
    )
    expect(ref.current?.indeterminate).toBe(true)
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed')
    rerender(
      <CheckBox ref={ref} indeterminate={false}>
        All
      </CheckBox>
    )
    expect(ref.current?.indeterminate).toBe(false)
  })

  it('keeps native table semantics, arbitrary children, and spanning cells', () => {
    render(
      <Table>
        <caption>Files</caption>
        <TableHead>
          <TableRow>
            <TableHeader>Name</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell colSpan={2}>
              <a href="/file">Arbitrary content</a>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(screen.getByRole('table', { name: 'Files' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader')).toHaveAttribute('scope', 'col')
    expect(screen.getByRole('cell')).toHaveAttribute('colspan', '2')
    expect(screen.getByRole('link')).toHaveAttribute('href', '/file')
  })
})

describe('tabs', () => {
  it('skips disabled tabs, wraps, and keeps panel state mounted', async () => {
    const user = userEvent.setup()
    render(
      <Tabs defaultValue="one">
        <TabList aria-label="test">
          <Tab value="one">One</Tab>
          <Tab value="disabled" disabled>
            Disabled
          </Tab>
          <Tab value="two">Two</Tab>
        </TabList>
        <TabPanel value="one">
          <TextBox aria-label="persistent" defaultValue="kept" />
        </TabPanel>
        <TabPanel value="two">Second</TabPanel>
      </Tabs>
    )
    screen.getByRole('tab', { name: 'One' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Second')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'One' })).toHaveFocus()
    expect(screen.getByLabelText('persistent')).toHaveValue('kept')
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveFocus()
  })

  it('leaves controlled selection to its owner and supports vertical keys', async () => {
    const change = vi.fn()
    render(
      <Tabs defaultValue="one" value="one" orientation="vertical" onValueChange={change}>
        <TabList>
          <Tab value="one">One</Tab>
          <Tab value="two">Two</Tab>
        </TabList>
        <TabPanel value="one">First</TabPanel>
        <TabPanel value="two">Second</TabPanel>
      </Tabs>
    )
    screen.getByRole('tab', { name: 'One' }).focus()
    await userEvent.setup().keyboard('{ArrowDown}')
    expect(change).toHaveBeenCalledWith('two')
    expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('long running interfaces', () => {
  it('follows new logs only while the user is at the bottom', () => {
    const { rerender } = render(
      <LogView>
        <LogEntry>one</LogEntry>
      </LogView>
    )
    const log = screen.getByRole('log')
    Object.defineProperties(log, {
      scrollHeight: { configurable: true, value: 600 },
      clientHeight: { configurable: true, value: 200 },
    })
    log.scrollTop = 400
    fireEvent.scroll(log)
    rerender(
      <LogView>
        <LogEntry>one</LogEntry>
        <LogEntry>two</LogEntry>
      </LogView>
    )
    expect(log.scrollTop).toBe(600)
    log.scrollTop = 30
    fireEvent.scroll(log)
    rerender(
      <LogView>
        <LogEntry>one</LogEntry>
        <LogEntry>two</LogEntry>
        <LogEntry>three</LogEntry>
      </LogView>
    )
    expect(log.scrollTop).toBe(30)
  })

  it('pauses a notification timer while hovered and resumes the remaining time', () => {
    vi.useFakeTimers()
    const change = vi.fn()
    render(
      <Toast open onOpenChange={change} duration={1000}>
        Saved
      </Toast>
    )
    act(() => vi.advanceTimersByTime(400))
    fireEvent.pointerEnter(screen.getByRole('status'))
    act(() => vi.advanceTimersByTime(2000))
    expect(change).not.toHaveBeenCalled()
    fireEvent.pointerLeave(screen.getByRole('status'))
    act(() => vi.advanceTimersByTime(599))
    expect(change).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(change).toHaveBeenCalledWith(false)
  })

  it('bounds pagination and never calls an out-of-range page', async () => {
    const change = vi.fn()
    render(<Pagination count={8} page={99} onPageChange={change} />)
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Previous page' }))
    expect(change).toHaveBeenCalledWith(7)
    expect(screen.getByRole('button', { name: 'Page 8' })).toHaveAttribute('aria-current', 'page')
  })

  it('renders the component library without a browser', () => {
    expect(() =>
      renderToString(
        <CakeProvider>
          <Button>Save</Button>
          <Tabs defaultValue="a">
            <TabList>
              <Tab value="a">A</Tab>
            </TabList>
            <TabPanel value="a">
              <LogView>
                <LogEntry time="12:00">Ready</LogEntry>
              </LogView>
            </TabPanel>
          </Tabs>
        </CakeProvider>
      )
    ).not.toThrow()
  })
})
