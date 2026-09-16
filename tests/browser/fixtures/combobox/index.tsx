import { useState } from 'react'
import { createRoot } from 'react-dom/client'

import { Button, CakeProvider, ComboBox, Dialog, Field } from '../../../../src'

import '../../../../src/styles.scss'

function Fixture() {
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState('')
  return (
    <CakeProvider>
      <Button onClick={() => setOpen(true)}>Choose provider</Button>
      <output aria-label="Saved provider">{result}</output>
      <Dialog title="Provider settings" open={open} onOpenChange={setOpen}>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            setResult(String(new FormData(event.currentTarget).get('provider')))
          }}
        >
          <Field label="Provider" htmlFor="provider">
            <ComboBox id="provider" searchable required name="provider" defaultValue="">
              <option value="">Choose a provider</option>
              <optgroup label="Unavailable" disabled>
                <option value="blocked">Blocked provider</option>
              </optgroup>
              <optgroup label="Available">
                {Array.from({ length: 100 }, (_, index) => (
                  <option key={index} value={`provider-${index}`}>
                    Provider {index}
                  </option>
                ))}
              </optgroup>
            </ComboBox>
          </Field>
          <Button type="submit">Save</Button>
          <Button type="reset">Reset</Button>
        </form>
      </Dialog>
    </CakeProvider>
  )
}

createRoot(document.getElementById('root')!).render(<Fixture />)
