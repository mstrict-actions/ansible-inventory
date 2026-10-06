import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as core from '@actions/core'
import { execFileSync } from 'node:child_process'
import { hostCount, run } from '../src/main.ts'

const mocks = vi.hoisted((): { write: ReturnType<typeof vi.fn> } => ({
  write: vi.fn(),
}))

vi.mock(
  'node:child_process',
  (): { execFileSync: ReturnType<typeof vi.fn> } => ({
    execFileSync: vi.fn(),
  }),
)
vi.mock('@actions/core', (): object => ({
  getInput: vi.fn(),
  info: vi.fn(),
  notice: vi.fn(),
  warning: vi.fn(),
  setFailed: vi.fn(),
  setOutput: vi.fn(),
  summary: {
    addHeading: vi.fn().mockReturnThis(),
    addRaw: vi.fn().mockReturnThis(),
    write: mocks.write,
  },
}))

const inputs = new Map([
  ['inventory', 'inventory.yml'],
  ['expected-hosts', '0'],
  ['working-directory', '.'],
  ['ansible-config', ''],
])
beforeEach((): void => {
  vi.clearAllMocks()
  vi.mocked(core.getInput).mockImplementation(
    (name): string => inputs.get(name) ?? '',
  )
  vi.mocked(execFileSync).mockReturnValue('{"_meta":{"hostvars":{}}}')
  mocks.write.mockResolvedValue(core.summary)
  delete process.env['GITHUB_STEP_SUMMARY']
  inputs.set('expected-hosts', '0')
  inputs.set('working-directory', '.')
  inputs.set('ansible-config', '')
})

describe('inventory validation', (): void => {
  it('counts hosts without reading their values', (): void => {
    expect(hostCount({ _meta: { hostvars: { first: {}, second: {} } } })).toBe(
      2,
    )
  })
  it.each([{}, { _meta: {} }, { _meta: { hostvars: [] } }, null])(
    'rejects invalid inventory %j',
    (value): void => {
      expect((): number => hostCount(value)).toThrow()
    },
  )
  it('reports zero hosts through native UI', (): void => {
    process.env['GITHUB_STEP_SUMMARY'] = '/tmp/summary'
    run()
    expect(core.setOutput).toHaveBeenCalledWith('host-count', 0)
    expect(core.setOutput).toHaveBeenCalledWith('matched', true)
    expect(core.notice).toHaveBeenCalledWith(
      'Inventory verified: 0 hosts (expected 0)',
    )
    expect(mocks.write).toHaveBeenCalled()
    expect(core.setFailed).not.toHaveBeenCalled()
  })
  it('reports a mismatch without leaking hostvars', (): void => {
    vi.mocked(execFileSync).mockReturnValue(
      '{"_meta":{"hostvars":{"secret-host":{}}}}',
    )
    run()
    expect(core.setOutput).toHaveBeenCalledWith('matched', false)
    expect(core.setFailed).toHaveBeenCalledWith(
      'Expected 0 hosts; discovered 1',
    )
  })
  it('rejects invalid expected count', (): void => {
    inputs.set('expected-hosts', '-1')
    run()
    expect(execFileSync).not.toHaveBeenCalled()
    expect(core.setFailed).toHaveBeenCalledWith(
      'expected-hosts must be a nonnegative integer',
    )
  })
  it('hides command failures and invalid JSON', (): void => {
    vi.mocked(execFileSync).mockImplementation((): never => {
      throw new Error('secret from provider')
    })
    run()
    expect(core.setFailed).toHaveBeenCalledWith(
      'Inventory check failed; Ansible output withheld',
    )
    vi.mocked(execFileSync).mockReturnValue('{bad')
    run()
    expect(core.setFailed).toHaveBeenCalledWith(
      'Inventory check failed; Ansible output withheld',
    )
  })
  it('uses explicit working directory and config', (): void => {
    inputs.set('working-directory', '')
    inputs.set('ansible-config', 'config/ansible.cfg')
    run()
    expect(execFileSync).toHaveBeenCalled()
    expect(core.setFailed).not.toHaveBeenCalled()
  })
  it('reports malformed inventory without host data', (): void => {
    vi.mocked(execFileSync).mockReturnValue('{}')
    run()
    expect(core.setFailed).toHaveBeenCalledWith(
      'Ansible inventory has no metadata',
    )
  })
  it('warns if summary writing fails', async (): Promise<void> => {
    process.env['GITHUB_STEP_SUMMARY'] = '/tmp/summary'
    mocks.write.mockRejectedValue(new Error('summary unavailable'))
    run()
    await new Promise<void>((resolve): void => {
      setImmediate(resolve)
    })
    expect(core.warning).toHaveBeenCalledWith(
      'Could not write inventory summary',
    )
  })
})
