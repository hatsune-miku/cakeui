import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { verifyArtifact, verifyPublished } from './release.mjs'

export function browserPayload(version, source, files, integrity = null) {
  assert.equal(version.trim(), version, 'Version cannot contain surrounding whitespace.')
  assert.match(version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/)
  assert(['npm', 'preview'].includes(source))
  assert.deepEqual(Object.keys(files).sort(), ['cakeui.css', 'cakeui.min.js'])
  return {
    version,
    source,
    integrity,
    files: Object.fromEntries(
      Object.entries(files).map(([name, bytes]) => {
        assert(bytes.length > 0 && bytes.length < 4 * 1024 * 1024, 'Unexpected browser asset size.')
        return [name, { sha256: createHash('sha256').update(bytes).digest('hex'), data: bytes.toString('base64') }]
      })
    ),
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      'artifact-dir': { type: 'string', default: '.cache/release' },
      preview: { type: 'boolean' },
      check: { type: 'boolean' },
    },
  })
  const root = fileURLToPath(new URL('..', import.meta.url))
  const sshArgs = ['-T', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=15']
  if (process.env.CAKEUI_DIST_IDENTITY_FILE)
    sshArgs.push('-i', process.env.CAKEUI_DIST_IDENTITY_FILE, '-o', 'IdentitiesOnly=yes')
  if (process.env.CAKEUI_DIST_KNOWN_HOSTS_FILE)
    sshArgs.push('-o', `UserKnownHostsFile=${process.env.CAKEUI_DIST_KNOWN_HOSTS_FILE}`)
  sshArgs.push('miku@vanillacake.cn')
  if (values.check) {
    console.log(
      execFileSync('ssh', [...sshArgs, '/usr/local/libexec/cakeui-dist-receive check'], {
        encoding: 'utf8',
        timeout: 30_000,
      }).trim()
    )
    return
  }
  let payload
  if (values.preview) {
    assert(!process.env.GITHUB_ACTIONS, 'Preview deployment is a local bootstrap operation.')
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
    payload = browserPayload(
      pkg.version,
      'preview',
      Object.fromEntries(
        ['cakeui.min.js', 'cakeui.css'].map((name) => [name, readFileSync(resolve(root, 'dist/browser', name))])
      )
    )
  } else {
    const artifact = resolve(root, values['artifact-dir'])
    const bytes = readFileSync(resolve(artifact, 'package.tgz'))
    const metadata = JSON.parse(readFileSync(resolve(artifact, 'metadata.json'), 'utf8'))
    const pkg = JSON.parse(
      execFileSync('tar', ['-xOf', resolve(artifact, 'package.tgz'), 'package/package.json'], { encoding: 'utf8' })
    )
    const info = { name: '@a1knla/cakeui', version: pkg.version }
    assert.equal(pkg.name, info.name)
    assert.equal(pkg.author, 'hatsune-miku')
    assert.equal(pkg.repository?.url, 'git+https://github.com/hatsune-miku/cakeui.git')
    if (process.env.GITHUB_ACTIONS) {
      assert.equal(process.env.GITHUB_REPOSITORY, 'hatsune-miku/cakeui')
      assert.equal(process.env.GITHUB_EVENT_NAME, 'push')
      assert.equal(process.env.GITHUB_REF, `refs/tags/v${pkg.version}`)
    }
    const integrity = verifyArtifact(bytes, metadata, info)
    await verifyPublished(info, integrity)
    payload = browserPayload(
      pkg.version,
      'npm',
      Object.fromEntries(
        ['cakeui.min.js', 'cakeui.css'].map((name) => [
          name,
          execFileSync('tar', ['-xOf', resolve(artifact, 'package.tgz'), `package/dist/browser/${name}`], {
            maxBuffer: 4 * 1024 * 1024,
          }),
        ])
      ),
      integrity
    )
  }
  const result = JSON.parse(
    execFileSync('ssh', [...sshArgs, '/usr/local/libexec/cakeui-dist-receive publish'], {
      input: JSON.stringify(payload),
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
    })
  )
  assert.match(result.path, /^(releases\/[0-9A-Za-z.-]+|previews\/[a-f0-9]{16})$/)
  for (const [name, file] of Object.entries(payload.files)) {
    const response = await fetch(`https://vanillacake.cn/cakeui-dist/${result.path}/${name}`, {
      signal: AbortSignal.timeout(30_000),
    })
    assert(response.ok, `Published browser asset is unavailable: ${name} (HTTP ${response.status}).`)
    const type = response.headers.get('content-type') ?? ''
    assert(
      name.endsWith('.css') ? type.includes('text/css') : /(?:application|text)\/javascript/.test(type),
      `Incorrect MIME type for ${name}.`
    )
    assert.equal(
      response.headers.get('access-control-allow-origin'),
      '*',
      'Browser assets must allow cross-origin use.'
    )
    const hash = createHash('sha256')
      .update(Buffer.from(await response.arrayBuffer()))
      .digest('hex')
    assert.equal(hash, file.sha256, `Public browser asset differs from the verified package: ${name}.`)
  }
  console.log(`Browser distribution verified: https://vanillacake.cn/cakeui-dist/${result.path}/ (${result.channel})`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
