# Secrets and 1Password

## The rule
Secrets live in 1Password only. Never write a `.env` file or any file containing
a secret value. `.env.op` holds `op://` references and is committed. Run anything
that needs a secret through `bin/with-secrets <command>`, which wraps
`op run --env-file=.env.op -- <command>`.

Vercel's environment variables are the deploy-side copy; set them in Vercel's UI.

## Claude never reads a secret's value
Not the value, not a prefix, not a length, not a byte dump. To prove a credential
works, run the real command through `bin/with-secrets` and report the exit code.
Writing to the vault is Noj's job, in the 1Password app.

Enforced in order by auto-mode's classifier, `permissions.deny` in
`~/.claude/settings.json`, and the hook `~/.claude/hooks/block-secret-reads.py`.
Fuller guidance: `~/.claude/instructions/onepassword-access.md`.

## Service accounts only — never the desktop CLI integration
The 1Password desktop app's "Integrate with 1Password CLI" switch signs in
*every* shell on the machine as the whole account, agent shells included. On
2026-09-15 it gave Claude read access to five vaults, including a client's, when
one was intended. It is a single switch with no way to separate a human's
terminal from an agent's. **Keep it off.**

Access is a service account scoped read-only to `SlackAgentOS`, and nothing else.
Its token is in the login Keychain under service `op-slackagentos`, and
`bin/with-secrets` reads it without prompting — so Claude does have that one
vault, read-only. State it that way, not as "no access". Check with
`op vault list`: one vault, or the integration is back on.

## 1Password is a convenience here, not a dependency
The deployed bot reads `SLACK_SIGNING_SECRET`, `SLACK_BOT_TOKEN`, `E2B_API_KEY`
and `CLAUDE_CODE_OAUTH_TOKEN` from Vercel's own environment variables and never
contacts 1Password. Only local tooling needs the vault: `bin/preflight`,
`bin/smoke`, and `e2b/build.mjs`. Set the four values by hand in Vercel's
dashboard and the bot runs with no vault, no service account, and no `op`
installed.
