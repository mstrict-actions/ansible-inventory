import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let directory: string
beforeAll((): void => {
  directory = mkdtempSync(join(tmpdir(), 'ansible-inventory-'))
  execFileSync(process.execPath, [
    resolve('build.config.mjs'),
    join(directory, 'fresh.mjs'),
  ])
  copyFileSync(resolve('dist/index.js'), join(directory, 'committed.mjs'))
  const executable = join(directory, 'ansible-inventory')
  writeFileSync(
    executable,
    '#!/bin/sh\nprintf \'%s\\n\' \'{"_meta":{"hostvars":{}}}\'\n',
  )
  chmodSync(executable, 0o755)
})
afterAll((): void => {
  if (typeof directory === 'string')
    rmSync(directory, { recursive: true, force: true })
})
describe.each(['fresh.mjs', 'committed.mjs'])('bundle %s', (entry): void => {
  it('runs outside repository and publishes outputs and summary', (): void => {
    const output = join(directory, `${entry}.output`)
    const summary = join(directory, `${entry}.summary`)
    writeFileSync(output, '')
    writeFileSync(summary, '')
    const result = spawnSync(process.execPath, [join(directory, entry)], {
      cwd: directory,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${directory}${delimiter}${process.env['PATH'] ?? ''}`,
        INPUT_INVENTORY: 'fake.yml',
        'INPUT_EXPECTED-HOSTS': '0',
        GITHUB_OUTPUT: output,
        GITHUB_STEP_SUMMARY: summary,
        NODE_PATH: '',
      },
    })
    expect(result.status, result.stderr).toBe(0)
    expect(readFileSync(output, 'utf8')).toContain('host-count')
    expect(readFileSync(summary, 'utf8')).toContain(
      'Inventory verified: 0 hosts',
    )
  })
})
