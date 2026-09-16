import { createRef } from 'react'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Button, ComboBox, Field } from '../src'

beforeEach(() => {
  // jsdom has no top layer; positioning, light dismissal and clipping are tested in Chrome.
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable: true,
    value: function showPopover(this: HTMLElement) {
      this.style.display = 'block'
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'hidePopover', {
    configurable: true,
    value: function hidePopover(this: HTMLElement) {
      this.style.display = 'none'
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
  const matches = HTMLElement.prototype.matches
  vi.spyOn(HTMLElement.prototype, 'matches').mockImplementation(function matchesPopover(this: HTMLElement, selector) {
    return selector === ':popover-open' ? this.style.display === 'block' : matches.call(this, selector)
  })
})

afterEach(() => vi.restoreAllMocks())

describe('searchable ComboBox', () => {
  it('filters labels and values, skips disabled groups, and emits a native select change', async () => {
    const ref = createRef<HTMLSelectElement>()
    const change = vi.fn()
    const targets: EventTarget[] = []
    render(
      <form aria-label="settings">
        <Field label="Provider" htmlFor="provider">
          <ComboBox
            searchable
            id="provider"
            ref={ref}
            name="provider"
            defaultValue=""
            onChange={(event) => {
              targets.push(event.currentTarget)
              change(event.currentTarget.value)
            }}
          >
            <option value="">Choose</option>
            <>
              <optgroup label="Disabled" disabled>
                <option value="openai-disabled">OpenAI unavailable</option>
              </optgroup>
              <optgroup label="Cloud">
                <option value="openai">OpenAI</option>
                <option value="anthropic">Claude</option>
              </optgroup>
            </>
          </ComboBox>
        </Field>
      </form>
    )
    const user = userEvent.setup()
    const input = screen.getByRole('combobox', { name: 'Provider' })
    await user.click(screen.getByText('Provider'))
    expect(input).toHaveFocus()
    await user.type(input, 'OPENAI')
    expect(screen.getByRole('option', { name: /OpenAI unavailable/ })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.queryByRole('option', { name: /Claude/ })).not.toBeInTheDocument()
    await user.keyboard('{Enter}')
    expect(input).toHaveValue('OpenAI')
    expect(ref.current).toBeInstanceOf(HTMLSelectElement)
    expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('provider')).toBe('openai')
    expect(change).toHaveBeenCalledExactlyOnceWith('openai')
    expect(targets[0]).toBe(ref.current)
    await user.click(input)
    await user.type(input, 'anthro')
    await user.keyboard('{Enter}')
    expect(input).toHaveValue('Claude')
    expect(ref.current).toHaveValue('anthropic')
  })

  it('keeps search text out of FormData and cancels without selecting or submitting', async () => {
    const submit = vi.fn((event) => event.preventDefault())
    render(
      <form aria-label="settings" onSubmit={submit}>
        <ComboBox searchable name="provider" aria-label="Provider" defaultValue="a" emptyText="Nothing found">
          <option value="a">Alpha</option>
          <option value="b">Beta</option>
        </ComboBox>
        <Button>Next</Button>
      </form>
    )
    const user = userEvent.setup()
    const input = screen.getByRole('combobox')
    await user.click(input)
    await user.type(input, 'missing')
    expect(screen.getByRole('status')).toHaveTextContent('Nothing found')
    await user.keyboard('{Enter}')
    expect(submit).not.toHaveBeenCalled()
    expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('provider')).toBe('a')
    await user.keyboard('{Escape}')
    expect(input).toHaveValue('Alpha')
    expect(input).toHaveFocus()
    expect(input).toHaveAttribute('aria-expanded', 'false')
    await user.click(input)
    await user.type(input, 'Beta')
    await user.tab()
    expect(input).toHaveValue('Alpha')
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
  })

  it('does not select with an IME confirmation key', async () => {
    const change = vi.fn()
    render(
      <ComboBox searchable aria-label="Provider" defaultValue="" onChange={change}>
        <option value="">Choose</option>
        <option value="local">本地模型</option>
      </ComboBox>
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: '本地' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true, keyCode: 229 })
    expect(change).not.toHaveBeenCalled()
    fireEvent.compositionEnd(input)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(change).toHaveBeenCalledOnce()
    expect(input).toHaveValue('本地模型')
  })

  it('retains controlled values and updates labels when options change', async () => {
    const ref = createRef<HTMLSelectElement>()
    const change = vi.fn()
    const { rerender } = render(
      <ComboBox searchable aria-label="Provider" ref={ref} value="a" onChange={change}>
        <option value="a">Alpha</option>
        <option value="b">Beta</option>
      </ComboBox>
    )
    const user = userEvent.setup()
    const input = screen.getByRole('combobox')
    await user.click(input)
    await user.type(input, 'Beta')
    await user.keyboard('{Enter}')
    expect(change).toHaveBeenCalledOnce()
    expect(ref.current).toHaveValue('a')
    expect(input).toHaveValue('Alpha')
    rerender(
      <ComboBox searchable aria-label="Provider" ref={ref} value="b" onChange={change}>
        <option value="a">Alpha</option>
        <option value="b">Updated Beta</option>
      </ComboBox>
    )
    expect(input).toHaveValue('Updated Beta')
  })

  it('resets externally associated forms, preserves validation, and delegates ref focus', async () => {
    const ref = createRef<HTMLSelectElement>()
    render(
      <>
        <form id="settings" aria-label="settings">
          <Button type="reset">Reset</Button>
        </form>
        <ComboBox searchable aria-label="Provider" name="provider" form="settings" ref={ref} required defaultValue="">
          <option value="">Choose</option>
          <option value="a">Alpha</option>
        </ComboBox>
      </>
    )
    const user = userEvent.setup()
    const input = screen.getByRole('combobox')
    act(() => {
      expect(ref.current?.checkValidity()).toBe(false)
    })
    expect(input).toHaveFocus()
    await user.type(input, 'Alpha')
    await user.keyboard('{Enter}')
    expect(ref.current?.checkValidity()).toBe(true)
    expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('provider')).toBe('a')
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(input).toHaveValue('Choose')
    expect(ref.current).toHaveValue('')
    act(() => ref.current?.focus())
    expect(input).toHaveFocus()
  })

  it('keeps disabled fields and multi-select behavior native', () => {
    const { rerender } = render(
      <fieldset disabled>
        <ComboBox searchable aria-label="Provider" name="provider">
          <option value="a">Alpha</option>
        </ComboBox>
      </fieldset>
    )
    expect(screen.getByRole('combobox')).toBeDisabled()
    rerender(
      <ComboBox searchable multiple aria-label="Provider">
        <option value="a">Alpha</option>
      </ComboBox>
    )
    expect(screen.getByRole('listbox').tagName).toBe('SELECT')
    expect(screen.getByRole('listbox')).not.toHaveAttribute('searchable')
  })
})
