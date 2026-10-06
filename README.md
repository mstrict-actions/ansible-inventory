# Ansible inventory gate

A GitHub Action that queries `ansible-inventory` and checks the number of
discovered hosts. It reports progress, outcome, and duration through native
GitHub logs and job summary while withholding hostvars and CLI output.

Install Ansible and the required collections before calling the Action. See
`action.yml` for inputs and outputs. Pin `uses:` to a tested full commit SHA.

The current release checks inventory only; it does not establish SSH trust or
run a playbook. Development commands are in `package.json`; read `AGENTS.md`
before changing workflows or action behavior.
