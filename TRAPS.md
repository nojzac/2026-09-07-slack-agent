# Traps — things that cost hours in lesson 04, and will recur

Ray's lesson 04 video is 4m14s. Ours took an evening. Almost none of the
difference was the code: it was account state Ray already had, one trap the
video passes over, and the extra work of doing it properly. Read this before
lesson 05 — the same stack (Slack app + Vercel + 1Password) is used throughout.

## Prerequisites Ray already had and the video never mentions

**Vercel must have a GitHub login connection before anything else.**
Without it: `vercel link` refuses ("You need to add a Login Connection to your
GitHub account first"), and — much worse — CLI deploys are silently *blocked*.
They sit at status `UNKNOWN` forever, with no build logs and no error from the
CLI. The dashboard is the only place that says why: "the commit email
<you>@example.com could not be matched to a GitHub account".

The email is a red herring. The fix is to connect GitHub to Vercel (account
settings → Login Connections → Add Connection → GitHub, namespace = your GitHub
user, repo access scoped to this repo). Do NOT change `git config user.email`
as Vercel's help text suggests, if GitHub already attributes your commits to
your account. Check that with:

    gh api repos/<owner>/<repo>/commits --jq '.[] | "\(.commit.author.email) \(.author.login)"'

If `author.login` is your username, the email is verified and fine.

**Create the Slack app from the manifest at the start, in parallel.** Ray does
this while Claude is still writing code. If the app already exists, you end up
setting scopes, events and the request URL by hand in the UI, which is where the
next trap lives.

## The trap the video glosses over

**Slack's Event Subscriptions page does nothing until you click Save Changes.**
The green **✓ Verified** beside the Request URL only proves Slack can reach your
endpoint. It does not mean Slack will send you events. The save bar sits at the
very bottom of a long page, easily missed.

Symptom: the endpoint is verified and provably healthy, the bot is in the
channel, the token works — and mentioning the bot does nothing at all, with no
error anywhere.

**Never paste a manifest's placeholder URL.** `https://<deployment>/api/...`
verifies as "Your URL didn't respond". Fill in the real domain first.

## Debugging this shape of problem

Test each link separately instead of guessing. In order, all runnable from here:

1. `curl <url>/api/slack/events` — is the deployment alive?
2. Hand-signed `url_verification` → does it echo the challenge? (signing secret matches)
3. Deliberately bad signature → 401? (the check is real)
4. Direct `chat.postMessage` with the bot token → does it post? (token, scope, channel membership)
5. Hand-signed `app_mention` POSTed at production → does the threaded reply appear? (handler works)

If 1–5 pass and a real mention still does nothing, the fault is upstream in
Slack's dispatch: unsaved settings first, app-needs-reinstall second.
`bin/with-secrets` gives you the secrets for steps 2–5.

## 1Password service accounts

- `op service-account create <name> --vault <Vault>:read_items --raw` prints the
  token once. Pipe it straight into the Keychain:

      security add-generic-password -U -a "$USER" -s op-slackagentos \
        -w "$(op service-account create <name> --vault <Vault>:read_items --raw)"

- **The interactive `security ... -w` prompt truncates at 128 characters.** A real
  token is ~830. A truncated one fails with "failed to DecodeSACredentials …
  unexpected end of JSON input". Never paste the token into that prompt.
- `-U` is required to overwrite an existing Keychain entry; without it you get
  "The specified item already exists".
- The CLI has no `service-account list` or `delete` — only `create` and
  `ratelimit`. Manage them in the web UI, **on the right account**: ours lives on
  `smartflowllc.1password.com`, not the personal one. `op whoami` with the token
  set tells you which.
- Service accounts cannot be granted your Private vault, and need a
  Teams/Business account.

## Vercel specifics for this repo

- **The app is in a subfolder**, so the project's Root Directory must be
  `joestar-agent`. With it set, the Vercel CLI applies it *on top of* its working
  directory — so CI must run `vercel deploy` from the **repo root**, not from
  `joestar-agent/`, or it looks for `joestar-agent/joestar-agent`.
- `vercel link` and `vercel dev` write a `.env.local`. `vercel env pull` would
  write the real secrets into it. **Never run `vercel env pull`.**
  `joestar-agent/.gitignore` blocks `.env*` as a backstop.
- Env vars added by CLI default to type *Secret*: hidden in the dashboard and
  not retrievable. That is what we want; it also means you cannot read them back.
- Production deploys come from GitHub Actions only — `joestar-agent/vercel.json`
  disables Vercel's own git trigger so the tests gate production.

## A dependency that works locally and dies on Vercel (lesson 05)

**Symptom.** Every request to the deployed function returns 500 with
`FUNCTION_INVOCATION_FAILED`. A GET, which should be a clean 405, fails the
same way — the giveaway that it breaks at module load, before any routing.
Local tests all pass.

**Cause.** `import { Sandbox } from 'e2b'`. The e2b package ships no `exports`
map, so Node follows `main` to the CommonJS build, which calls
`require('chalk')` — and chalk v5 is ESM-only. Node 22+ tolerates `require()`
of an ESM module, so it works on a modern local Node and inside `node --test`.
Vercel's bundled runtime does its own module loading and does not, so it throws
`ERR_REQUIRE_ESM` and the process exits.

**Wrong fix.** Raising `engines.node`. The project was already on Node 24,
which supports require(esm) natively. The Node version was never the problem.

**Fix.** Import the ESM build explicitly: `from 'e2b/dist/index.mjs'`. Ugly,
because it reaches past the package's front door, but it is the thing that
makes both environments load the same file.

**The general lesson.** Tests passing locally says nothing about whether a
dependency *loads* in the deploy runtime. The cheap check is a GET against the
deployed endpoint: a POST-only function should answer 405. Anything else, and
`vercel logs <url>` names the failing module in one line. Preflight already
does this check — it is what caught it.

## The 1Password desktop CLI integration hands an agent your whole account

**Symptom.** Nothing looks wrong. `op run` works, the vault-scoped service
account exists, the project rules say read-only on one vault — and an agent
shell can still run `op vault list` and see every vault in the account.

**Cause.** "Integrate with 1Password CLI" in the desktop app's Developer
settings. It authenticates *every* shell on the machine as the signed-in human:
interactive, non-interactive, scripts, agents. It ignores service-account
scoping entirely, because it is a different authentication path. Having a
scoped service account changes nothing while the integration is on — the wide
door is still there, and it is the one `op` reaches for first.

**Fix.** Turn it off, and authenticate with `OP_SERVICE_ACCOUNT_TOKEN` only.
`op vault list` should then return exactly the vaults that account was granted.
That single check is the whole verification.

**Consequence to expect.** It narrows your own terminal too, not just the
agent's. The 1Password app and browser extension are unaffected; only the CLI
changes. If you need full-account CLI again, sign in for that one session
rather than leaving the integration on.

**The wider lesson.** Scoping a credential is worthless while a broader
credential for the same store is also reachable. Check what the shell can
actually see, rather than what it was configured to see — and have the agent
run that check from *its own* shell, since that is the one in question.

## Where the time actually went

| Cause | Roughly |
|---|---|
| Vercel↔GitHub connection missing (blocked deploys, misdiagnosed twice) | the largest share |
| Slack settings verified but never saved | second largest |
| 1Password service account setup, including a truncated token and a clipboard mix-up | third |
| Work Ray never does: tests, CI, gated deploys, retry dedupe, logging, docs | the rest |

Only the last row is work you chose. The first three are one-time setup and are
now done — lesson 05 should feel much closer to the video.
