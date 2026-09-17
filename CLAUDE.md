# CLAUDE.md — how to work in this project

The code for Noj's own Claude-in-Slack agent, built by following Ray Amjad's
"Slack agents" course. Read README.md first, then RESUME.md for where things stand.

## Always
- **Secrets live in 1Password only.** Never write a `.env` or any file holding a
  secret value. Never read a secret's value — not a prefix, not a length, not a
  byte dump. Run anything needing one through `bin/with-secrets <command>`.
- **Service accounts only. Never the 1Password desktop CLI integration.** It
  signs in every shell on the machine as the whole account.
- **Never commit a file over 10 MB.** The pre-commit hook enforces this.
- **No push to any remote without Noj's explicit go.**
- Lesson pages are made here, in `sops/lesson-NN/`; course inputs stay in
  `course/`.
- **MCP servers are added only if handing their full capability to any workspace
  member would be acceptable.** Read-only public data qualifies. Production
  databases, payment dashboards and anything with customer data do not, and do
  not become acceptable by being read-only — until per-user or per-channel
  scoping exists, there is no such thing as "the bot can see it but people
  cannot". Everyone who can message the bot gets every tool it has.

## Read first, then act
- BEFORE running any `op` command, handling a credential, or wondering where a
  secret lives → `docs/secrets.md`
- AFTER changing what the deployed bot does, or when asked to verify it →
  `docs/verifying.md`
- BEFORE starting, building a page for, or finishing a lesson → `docs/lessons.md`
