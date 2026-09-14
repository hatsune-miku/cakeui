import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { assertUnpublished, getReleaseInfo, verifyArtifact } from '../scripts/release.mjs'

function fixture(version = '1.2.3') {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  manifest.version = version
  const entry = { name: manifest.name, version }
  const lock = { ...entry, packages: { '': { ...entry } } }
  const context = { repository: 'hatsune-miku/cakeui', eventName: 'push', ref: `refs/tags/v${version}` }
  return { manifest, lock, context }
}

test('only matching release tags publish; stable and prerelease dist-tags are separate', () => {
  for (const [version, distTag] of [
    ['1.2.3', 'latest'],
    ['1.2.3-beta.1', 'next'],
    ['2.0.0-0', 'next'],
  ]) {
    const { manifest, lock, context } = fixture(version)
    assert.deepEqual(getReleaseInfo(manifest, lock, context), { name: manifest.name, version, distTag, publish: true })
  }
})

test('manual runs never publish, even when dispatched on a release tag', () => {
  const { manifest, lock, context } = fixture()
  for (const ref of ['refs/heads/main', 'refs/tags/v1.2.3']) {
    assert.equal(getReleaseInfo(manifest, lock, { ...context, eventName: 'workflow_dispatch', ref }).publish, false)
  }
})

test('wrong tags, branch pushes, unsupported events and fork identities are rejected', () => {
  const { manifest, lock, context } = fixture()
  for (const patch of [
    { ref: 'refs/tags/v1.2.4' },
    { ref: 'refs/heads/main' },
    { eventName: 'pull_request' },
    { repository: 'someone/cakeui' },
  ])
    assert.throws(() => getReleaseInfo(manifest, lock, { ...context, ...patch }))
})

test('package identity, author, access and registry cannot silently change', () => {
  const { manifest, lock, context } = fixture()
  for (const patch of [
    { name: 'cakeui' },
    { author: 'someone' },
    { repository: { url: 'git+https://github.com/someone/cakeui.git' } },
    { publishConfig: { ...manifest.publishConfig, registry: 'https://registry.npmmirror.com/' } },
    { publishConfig: { ...manifest.publishConfig, access: 'restricted' } },
    { private: true },
  ])
    assert.throws(() => getReleaseInfo({ ...manifest, ...patch }, lock, context))
})

test('both lockfile version records must agree with the package', () => {
  const { manifest, lock, context } = fixture()
  assert.throws(() => getReleaseInfo(manifest, { ...lock, version: '1.2.2' }, context), /Lockfile version/)
  assert.throws(
    () => getReleaseInfo(manifest, { ...lock, packages: { '': { ...lock.packages[''], version: '1.2.2' } } }, context),
    /Lockfile version/
  )
})

test('ambiguous, invalid or shell-like version strings cannot enter release outputs', () => {
  for (const version of [
    '01.2.3',
    '1.2',
    'v1.2.3',
    '1.2.3-beta.01',
    '1.2.3+build.1',
    '1.2.3\n',
    '1.2.3;echo bad',
    undefined,
  ]) {
    const { manifest, lock, context } = fixture(version)
    manifest.version = version
    assert.throws(() => getReleaseInfo(manifest, lock, context))
  }
})

test('only a registry 404 makes a version available; existing versions and errors stop release', async () => {
  const { manifest, lock, context } = fixture()
  const info = getReleaseInfo(manifest, lock, context)
  await assertUnpublished(info, async (url) => {
    assert.equal(url, 'https://registry.npmjs.org/%40a1knla%2Fcakeui/1.2.3')
    return new Response(null, { status: 404 })
  })
  for (const status of [200, 401, 403, 429, 500]) {
    await assert.rejects(assertUnpublished(info, async () => new Response(null, { status })))
  }
  await assert.rejects(
    assertUnpublished(info, async () => {
      throw new Error('network unavailable')
    })
  )
})

test('artifact corruption and metadata for another release are rejected', () => {
  const { manifest, lock, context } = fixture()
  const info = getReleaseInfo(manifest, lock, context)
  const bytes = Buffer.from('tested tarball bytes')
  const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`
  const metadata = { name: info.name, version: info.version, integrity }
  assert.equal(verifyArtifact(bytes, metadata, info), integrity)
  assert.throws(() => verifyArtifact(Buffer.from('changed bytes'), metadata, info), /integrity/)
  assert.throws(() => verifyArtifact(bytes, { ...metadata, version: '1.2.4' }, info), /version/)
  assert.throws(() => verifyArtifact(bytes, { ...metadata, name: 'cakeui' }, info), /name/)
})
