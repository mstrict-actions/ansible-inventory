# Agent guide

This repository contains a standalone Node.js GitHub Action for checking Ansible
inventory cardinality. The source and `action.yml` define the contract;
consumers run the committed `dist` bundle.

## Change procedure

Inspect Git status and the package scripts before editing. Keep the action
input/output contract, source, tests, README, and bundle aligned. Run `npm ci`,
`npm run check:ci`, and `npm run build` on the Node major required by
`package.json`. Run `npm run check-dist` after committing a changed bundle.
Review the diff before an English Conventional Commit.

When pushing is authorized, read the resulting CI, Version, and both CodeQL
results for the pushed commit. A local pass is not a remote pass. Tags identify
main commits and do not certify CI success.

## Security and behavior

The Action may handle private inventory. Log count, stage, duration, and
controlled errors; keep hostvars, hostnames, and raw Ansible stdout/stderr out
of logs, annotations, summaries, and artifacts. Validate the parsed inventory
before counting hosts. A failed Ansible command must fail the Action.

Apply the shared strict TypeScript, ESLint, Prettier, and coverage policy from
the installed dev-tools package. Exceptions to lint rules must be narrow and
explained; assertions and non-null assertions are not accepted. Verify the
bundle in a separate process without `node_modules`.

## Specialized instructions

- For workflow creation, edits, or review, read
  [github-actions-hardening](.agents/skills/github-actions-hardening/SKILL.md).
- For Action/runtime upgrades, read
  [github-actions-runtime-upgrade-conventions](.agents/skills/github-actions-runtime-upgrade-conventions/SKILL.md).
- For CodeQL configuration or alerts, read
  [codeql](.agents/skills/codeql/SKILL.md).
- For changes to this guide or skills, read
  [writing-for-agents](.agents/skills/writing-for-agents/SKILL.md).

[Skill provenance](.agents/README.md) records the fixed upstream snapshots.
External Actions use full commit SHA pins with release comments. Checking jobs
use read-only tokens and checkout without persisted credentials. Review Copilot
Autofix suggestions as ordinary changes.
