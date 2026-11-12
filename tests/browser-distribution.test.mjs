import assert from 'node:assert/strict'
import { test } from 'node:test'

import { browserPayload } from '../scripts/deploy-browser.mjs'

test('browser deployment accepts only exact asset names, safe versions and bounded contents', () => {
  const files = { 'cakeui.min.js': Buffer.from('window.CakeUI = {}'), 'cakeui.css': Buffer.from('.cake-slide {}') }
  const payload = browserPayload('1.2.3', 'preview', files)
  assert.equal(payload.files['cakeui.css'].data, files['cakeui.css'].toString('base64'))
  assert.match(payload.files['cakeui.min.js'].sha256, /^[0-9a-f]{64}$/)
  for (const version of ['../other', '1.0.0/../../other', '1.0.0;true', '1.0.0\n', '01.2.3']) {
    assert.throws(() => browserPayload(version, 'preview', files))
  }
  assert.throws(() => browserPayload('1.2.3', 'preview', { ...files, '../extra': Buffer.from('x') }))
  assert.throws(() => browserPayload('1.2.3', 'preview', { ...files, 'cakeui.css': Buffer.alloc(0) }))
  assert.throws(() => browserPayload('1.2.3', 'unknown', files))
})
