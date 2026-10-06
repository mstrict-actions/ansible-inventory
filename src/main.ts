import * as core from '@actions/core'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

export function hostCount(value: unknown): number {
  if (typeof value !== 'object' || value === null || !('_meta' in value)) {
    throw new Error('Ansible inventory has no metadata')
  }
  const metadata = value._meta
  if (
    typeof metadata !== 'object' ||
    metadata === null ||
    !('hostvars' in metadata)
  ) {
    throw new Error('Ansible inventory has no hostvars')
  }
  const hosts = metadata.hostvars
  if (typeof hosts !== 'object' || hosts === null || Array.isArray(hosts)) {
    throw new Error('Ansible inventory hostvars are invalid')
  }
  return Object.keys(hosts).length
}

export function run(): void {
  const started = Date.now()
  let message = 'Inventory check did not complete'
  try {
    const inventory = core.getInput('inventory', { required: true })
    const expectedText = core.getInput('expected-hosts', { required: true })
    const expected = Number(expectedText)
    if (!Number.isSafeInteger(expected) || expected < 0) {
      throw new Error('expected-hosts must be a nonnegative integer')
    }
    const directory = core.getInput('working-directory')
    const cwd = resolve(directory.length > 0 ? directory : '.')
    const config = core.getInput('ansible-config')
    const env = {
      ...process.env,
      ...(config.length > 0 ? { ANSIBLE_CONFIG: resolve(cwd, config) } : {}),
    }
    core.info('Querying Ansible inventory; host data will stay private')
    const raw = execFileSync('ansible-inventory', ['-i', inventory, '--list'], {
      cwd,
      env,
      encoding: 'utf8',
      timeout: 120_000,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const count = hostCount(JSON.parse(raw))
    core.setOutput('host-count', count)
    core.setOutput('matched', count === expected)
    if (count !== expected) {
      throw new Error(
        `Expected ${expected.toString()} hosts; discovered ${count.toString()}`,
      )
    }
    message = `Inventory verified: ${count.toString()} hosts (expected ${expected.toString()})`
    core.notice(message)
  } catch (error) {
    message =
      error instanceof Error &&
      (error.message.startsWith('Expected ') ||
        error.message.startsWith('expected-hosts') ||
        error.message.startsWith('Ansible inventory'))
        ? error.message
        : 'Inventory check failed; Ansible output withheld'
    core.setFailed(message)
  } finally {
    const seconds = ((Date.now() - started) / 1000).toFixed(1)
    if (process.env['GITHUB_STEP_SUMMARY'] !== undefined) {
      core.summary
        .addHeading('Ansible inventory')
        .addRaw(`${message}. Duration: ${seconds}s.\n`)
        .write()
        .catch((): void => {
          core.warning('Could not write inventory summary')
        })
    }
  }
}
