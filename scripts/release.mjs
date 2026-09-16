import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { appendFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const repository = 'hatsune-miku/cakeui'
const registry = 'https://registry.npmjs.org/'
// Release versions deliberately exclude build metadata, which npm normalizes away.
const versionPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?$/

export function getReleaseInfo(manifest, lock, context) {
  assert.equal(context.repository, repository, 'Unexpected GitHub repository.')
  assert.equal(manifest.name, '@a1knla/cakeui', 'Unexpected package name.')
  assert.equal(manifest.author, 'miku', 'Package author must remain miku.')
  assert.equal(manifest.repository?.url, `git+https://github.com/${repository}.git`, 'Repository URL mismatch.')
  assert.equal(manifest.publishConfig?.registry, registry, 'Publish only to the official npm registry.')
  assert.equal(manifest.publishConfig?.access, 'public', 'The npm package must be public.')
  assert.notEqual(manifest.private, true, 'A private manifest cannot be published.')
  assert.equal(typeof manifest.version, 'string', 'A release version is required.')
  assert.equal(manifest.version.trim(), manifest.version, 'Release versions cannot contain surrounding whitespace.')
  assert.match(manifest.version, versionPattern, 'Use a SemVer release or prerelease without build metadata.')
  for (const entry of [lock, lock.packages?.['']]) {
    assert.equal(entry?.name, manifest.name, 'Lockfile package name mismatch.')
    assert.equal(entry?.version, manifest.version, 'Lockfile version mismatch.')
  }
  assert(['push', 'workflow_dispatch'].includes(context.eventName), 'Unsupported workflow event.')
  const publish = context.eventName === 'push'
  if (publish) assert.equal(context.ref, `refs/tags/v${manifest.version}`, 'Release tag must match package.json.')
  return {
    name: manifest.name,
    version: manifest.version,
    distTag: manifest.version.includes('-') ? 'next' : 'latest',
    publish,
  }
}

function versionUrl(info) {
  return `${registry}${encodeURIComponent(info.name)}/${encodeURIComponent(info.version)}`
}

export async function assertUnpublished(info, fetchRegistry = fetch) {
  const response = await fetchRegistry(versionUrl(info), { signal: AbortSignal.timeout(30_000) })
  if (response.status === 404) return
  if (response.ok) throw new Error(`${info.name}@${info.version} already exists; never overwrite or blindly retry it.`)
  throw new Error(`Cannot verify npm version availability (HTTP ${response.status}); publishing is stopped.`)
}

export function verifyArtifact(bytes, metadata, info) {
  assert.equal(metadata.name, info.name, 'Artifact package name mismatch.')
  assert.equal(metadata.version, info.version, 'Artifact version mismatch.')
  const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`
  assert.equal(metadata.integrity, integrity, 'Artifact integrity mismatch.')
  return integrity
}

export async function verifyPublished(info, integrity, fetchRegistry = fetch, wait = setTimeout) {
  // npm can accept a release before its processing queue makes it publicly readable.
  for (let attempt = 0; attempt < 31; attempt++) {
    const response = await fetchRegistry(versionUrl(info), { signal: AbortSignal.timeout(30_000) })
    if (response.status === 404 && attempt < 30) {
      await wait(10_000)
      continue
    }
    assert(response.ok, `Cannot verify the published version (HTTP ${response.status}); inspect npm before retrying.`)
    const published = await response.json()
    assert.equal(published.name, info.name)
    assert.equal(published.version, info.version)
    assert.equal(published.dist?.integrity, integrity, 'The public tarball differs from the tested artifact.')
    console.log(`Verified public npm artifact: ${info.name}@${info.version}`)
    return
  }
}

async function main() {
  const command = process.argv[2]
  assert(['check', 'verify', 'verify-published'].includes(command), 'Expected check, verify or verify-published.')
  const root = fileURLToPath(new URL('..', import.meta.url))
  function readJson(path) {
    return JSON.parse(readFileSync(resolve(root, path), 'utf8'))
  }
  const info = getReleaseInfo(readJson('package.json'), readJson('package-lock.json'), {
    repository: process.env.GITHUB_REPOSITORY ?? repository,
    eventName: process.env.GITHUB_EVENT_NAME ?? 'workflow_dispatch',
    ref: process.env.GITHUB_REF ?? '',
  })
  if (command !== 'check') {
    const integrity = verifyArtifact(
      readFileSync(resolve(root, '.cache/release/package.tgz')),
      readJson('.cache/release/metadata.json'),
      info
    )
    if (command === 'verify-published') {
      await verifyPublished(info, integrity)
      return
    }
  }
  if (info.publish) await assertUnpublished(info)
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `version=${info.version}\ndist_tag=${info.distTag}\n`)
  }
  console.log(JSON.stringify(info))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
