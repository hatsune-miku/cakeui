import { createRef } from 'react'

import { beforeAll, describe, expect, it, vi } from 'vitest'

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Button, CakeProvider, ThemeSettings } from '../src'
import { type ThemeStorageAdapter, createThemeConfig } from '../src/theme'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

describe('transactional theme settings', () => {
  it('previews without saving; Cancel and native cancel restore the applied configuration', async () => {
    const user = userEvent.setup()
    const save = vi.fn()
    const storage: ThemeStorageAdapter = { load: () => null, save }
    render(
      <CakeProvider data-testid="scope" theme="blue" mode="light">
        <ThemeSettings storage={storage} />
      </CakeProvider>
    )
    const trigger = screen.getByRole('button', { name: 'Loading theme…' })
    await waitFor(() => expect(trigger).toBeEnabled())
    await user.click(trigger)
    await user.click(screen.getByRole('radio', { name: '葡萄' }))
    expect(screen.getByTestId('scope')).toHaveAttribute('data-theme', 'grape')
    expect(save).not.toHaveBeenCalled()
    await user.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Cancel' }).at(-1)!)
    expect(screen.getByTestId('scope')).toHaveAttribute('data-theme', 'blue')
    await user.click(trigger)
    await user.click(screen.getByRole('radio', { name: '豆沙' }))
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }))
    expect(screen.getByTestId('scope')).toHaveAttribute('data-theme', 'blue')
    expect(save).not.toHaveBeenCalled()
  })

  it('preserves custom input and per-scheme choices, and only applies valid colors', async () => {
    const user = userEvent.setup()
    const save = vi.fn()
    render(
      <CakeProvider data-testid="scope">
        <ThemeSettings storage={{ load: () => null, save }} />
      </CakeProvider>
    )
    await waitFor(() => expect(screen.getByRole('button', { name: 'Theme' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Theme' }))
    await user.click(screen.getByRole('radio', { name: 'Custom' }))
    const color = screen.getByRole('textbox', { name: 'HEX or RGB' })
    await user.clear(color)
    await user.type(color, 'rgb(15, 25, 35)')
    await user.click(screen.getByRole('radio', { name: 'Dark' }))
    await user.click(screen.getByRole('radio', { name: 'Light text' }))
    await user.click(screen.getByRole('radio', { name: '粉' }))
    await user.click(screen.getByRole('radio', { name: 'Light' }))
    await user.click(screen.getByRole('radio', { name: 'Custom' }))
    expect(screen.getByRole('textbox')).toHaveValue('#0f1923')
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Light text' })).toBeChecked()
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), '#oops')
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('opaque HEX or RGB')
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), '#0f1923')
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    expect(save.mock.calls[0][0]).toMatchObject({
      scheme: 'custom',
      customColor: '#0f1923',
      options: { custom: { mode: 'dark', foreground: 'light' }, pink: { mode: 'light' } },
    })
    expect(screen.getByTestId('scope')).toHaveAttribute('data-theme', 'custom')
  })

  it('retains the applied appearance and reports a rejected save', async () => {
    const user = userEvent.setup(),
      onStorageError = vi.fn()
    const failure = new Error('Storage quota')
    const storage = {
      load: () => null,
      save: vi.fn(async () => {
        throw failure
      }),
    }
    render(
      <CakeProvider data-testid="scope">
        <ThemeSettings storage={storage} onStorageError={onStorageError} />
      </CakeProvider>
    )
    await waitFor(() => expect(screen.getByRole('button', { name: 'Theme' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Theme' }))
    await user.click(screen.getByRole('radio', { name: '绿豆沙' }))
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(onStorageError).toHaveBeenCalledWith(failure, 'save'))
    expect(screen.getByTestId('scope')).toHaveAttribute('data-theme', 'dousha-classic')
    expect(screen.getByRole('status')).toHaveTextContent('current appearance is kept')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the trigger focusable while a save is pending and prevents duplicate submissions', async () => {
    const user = userEvent.setup()
    let reject!: (error: Error) => void
    const storage = {
      load: () => null,
      save: vi.fn(
        () =>
          new Promise<void>((_, fail) => {
            reject = fail
          })
      ),
    }
    const onStorageError = vi.fn()
    render(
      <CakeProvider data-testid="scope">
        <ThemeSettings storage={storage} onStorageError={onStorageError} />
      </CakeProvider>
    )
    const trigger = await screen.findByRole('button', { name: 'Theme' })
    await user.click(trigger)
    await user.click(screen.getByRole('radio', { name: '葡萄' }))
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(trigger).not.toBeDisabled()
    expect(trigger).toHaveAttribute('aria-disabled', 'true')
    await user.click(trigger)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(storage.save).toHaveBeenCalledTimes(1)
    await act(async () => reject(new Error('Unavailable')))
    expect(onStorageError).toHaveBeenCalledWith(expect.any(Error), 'save')
    expect(screen.getByTestId('scope')).toHaveAttribute('data-theme', 'grape')
    expect(trigger).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('reports invalid stored config and ignores a late load after the host changes config', async () => {
    const onStorageError = vi.fn()
    const { unmount } = render(
      <CakeProvider theme="gold" data-testid="invalid">
        <ThemeSettings storage={{ load: () => ({ version: 99 }), save: vi.fn() }} onStorageError={onStorageError} />
      </CakeProvider>
    )
    await waitFor(() => expect(onStorageError).toHaveBeenCalledWith(expect.any(Error), 'load'))
    expect(screen.getByTestId('invalid')).toHaveAttribute('data-theme', 'gold')
    unmount()
    let finish!: (value: unknown) => void
    const storage = {
      load: () =>
        new Promise((resolve) => {
          finish = resolve
        }),
      save: vi.fn(),
    }
    const { rerender } = render(
      <CakeProvider config={createThemeConfig({ scheme: 'blue' })} data-testid="late">
        <ThemeSettings storage={storage} />
      </CakeProvider>
    )
    rerender(
      <CakeProvider config={createThemeConfig({ scheme: 'grape' })} data-testid="late">
        <ThemeSettings storage={storage} />
      </CakeProvider>
    )
    await act(async () => finish(createThemeConfig({ scheme: 'pink' })))
    expect(screen.getByTestId('late')).toHaveAttribute('data-theme', 'grape')
    expect(storage.save).not.toHaveBeenCalled()
  })

  it('cancels preview on unmount, keeps nested scopes isolated, and preserves native refs/style', async () => {
    const user = userEvent.setup(),
      ref = createRef<HTMLDivElement>(),
      triggerRef = createRef<HTMLButtonElement>()
    function Scope({ settings = true }) {
      return (
        <CakeProvider theme="gold" data-testid="outer">
          <CakeProvider ref={ref} data-testid="inner" style={{ '--business-spacing': '17px' } as React.CSSProperties}>
            {settings && <ThemeSettings ref={triggerRef} />}
            <Button>Sample</Button>
          </CakeProvider>
        </CakeProvider>
      )
    }
    const { rerender } = render(<Scope />)
    expect(ref.current).toBe(screen.getByTestId('inner'))
    expect(triggerRef.current).toBe(screen.getByRole('button', { name: 'Theme' }))
    await user.click(screen.getByRole('button', { name: 'Theme' }))
    await user.click(screen.getByRole('radio', { name: '葡萄' }))
    expect(screen.getByTestId('outer')).toHaveAttribute('data-theme', 'gold')
    expect(screen.getByTestId('inner')).toHaveAttribute('data-theme', 'grape')
    rerender(<Scope settings={false} />)
    expect(screen.getByTestId('inner')).toHaveAttribute('data-theme', 'blue')
    expect(ref.current?.style.getPropertyValue('--business-spacing')).toBe('17px')
  })
})
