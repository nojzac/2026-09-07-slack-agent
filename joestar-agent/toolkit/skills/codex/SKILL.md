---
name: codex
description: Get an independent second-opinion review, challenge, or consult from OpenAI's Codex CLI. Use when asked for a codex review, a second opinion, or to challenge this code.
---

## Preconditions

`codex` is installed globally in this image, but it is only *configured* if a
credential file exists: run `test -f ~/.codex/auth.json` first. If that fails,
say "Codex is not configured on this bot" and stop — do not try to fix it.

Never run `codex login`; it opens a browser, which does not exist here and
will just hang. If a call fails with an auth error, say that the operator
needs to re-paste `CODEX_AUTH_JSON` and stop. Do not retry an auth failure.

## Modes

**review** — for the last commit:

    codex review --commit "$(git rev-parse HEAD)"

or for a branch:

    codex review --base <branch>

Report PASS/FAIL: FAIL if any finding is tagged `[P1]`, otherwise PASS.

**challenge** — argue the other side of a change:

    codex exec "Argue against this change: <describe the diff/decision>" < /dev/null

**consult** — ask it a direct question:

    codex exec "<question>" < /dev/null

## CLI gotchas

- Always redirect stdin from `/dev/null` on `codex exec` — otherwise it hangs waiting to read a prompt that will never come.
- `codex` must run inside a git repo; it exits 0 even when it isn't one, so check `git rev-parse --is-inside-work-tree` first and don't trust the exit code.
- Never pass `--json`.
- `codex review` cannot take a free-text prompt together with `--base` or `--commit` — pick one form.
- If a call exits silently with no output, wait 10s and retry once, then give up — do not loop.
- Wrap every call in `timeout 150 codex …`: this run has about four minutes total, and time has to be left over to write the report after the call returns.

## Report format

Lead with the verdict (PASS/FAIL, or a one-line takeaway for challenge/consult).
Then one line per finding, in codex's own words:

    file:line — codex's own wording

Then a line starting `My read:` giving your own view on whether the findings
hold up.

Never paste raw codex logs or stdout — summarize into the format above.
