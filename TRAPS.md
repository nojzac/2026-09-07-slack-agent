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

## Branch protection silently stops enforcing when a repo goes private

Verified 2026-09-16, by pushing, not by reading a settings page.

On a free plan, rulesets work on public repositories and not on private ones.
Flipping a protected public repo to private does not delete the ruleset and does
not warn you — enforcement simply stops. The same push, from the same token, to
the same branch:

| Repo state | `git push origin main` |
| --- | --- |
| public, ruleset active | exit 1 — `GH013: Repository rule violations found` |
| private, same ruleset | **exit 0 — accepted** |

Nothing announced the change. The ruleset is still listed in the UI; the API
answers `403` rather than "disabled", which reads like a permissions problem
rather than a security one.

**Why this is worse than having no protection.** The written security model still
claims the default branch is protected, and every decision resting on that stays
unchanged — including how much access it is reasonable to give a bot. A control
that evaporates when an unrelated setting changes, without telling anyone, is a
control you will keep believing in.

The practical consequence for this project: a private repo on a free plan cannot
be given to the bot with `contents: write` and be considered protected. The
honest options are a public repo, GitHub Pro, or granting no write access.

## PreToolUse hooks DO fire under --dangerously-skip-permissions

Tested 2026-09-16 on **claude-code 2.1.274** (whatever `npm i -g
@anthropic-ai/claude-code@latest` installed into the E2B template that day).

The documentation says PreToolUse runs before the permission check in every
mode; there are open reports claiming the flag skips the hook layer entirely,
and older ones where the hook fired asynchronously and the command ran anyway.
It cannot be settled by reading, so it was tested: the bot was asked to
`git push --force`, and it came back with our own hook's message —

    PreToolUse:Bash hook error: [node /tmp/.joestar/block-destructive-push.mjs]:
    Force-push and branch deletion are disabled.

— and the remote ref was verified unchanged afterwards, server-side, not taken
from the bot's report. The command never reached git.

**This ages.** It is a behaviour of one CLI version. Re-test it whenever the
template is rebuilt with a newer Claude Code, because the failure mode is
silent: the hook simply stops being consulted and nothing announces it. And it
remains a nudge either way — an alias or `G=push; git $G -f` defeats a string
match. The documented fallback if it ever stops firing is a single narrow
`permissions.deny` rule, which applies in every mode including
`bypassPermissions`.

## A one-person repo cannot satisfy "1 approval" (lesson 09)

GitHub will not let you approve your own pull request. A ruleset requiring one
approval with an empty bypass list therefore blocks *everything* on a
single-maintainer repo — nobody can merge, including the owner.

The fix is a bypass actor, and **which** actor is the whole question:

- **Repository admin** in the bypass list → the human merges without a second
  reviewer; the App still cannot approve or merge its own PR. Correct.
- **The App** in the bypass list → the bot pushes straight to `main`. Every
  protection on the repo becomes decorative. Never do this; it is offered right
  next to the correct option in the picker.
- Dropping the approval count to 0 → the App can merge its own PRs, since it
  holds `contents: write`. Also wrong.

Merge with `gh pr merge N --squash --admin`; the `--admin` flag is what uses the
bypass. The PR will still report `BLOCKED / REVIEW_REQUIRED` beforehand — that
status does not account for bypass actors.

## A second confirmation: scope changes do not rotate the bot token

Lesson 09 added `channels:read` and `groups:read` and reinstalled. The token was
unchanged again, and `bin/preflight` validated it straight from the vault. Twice
now, consistent with `token_rotation_enabled: false`. Ray states rotation as
certain; it is not.

## A private key inside the repository (lesson 08)

The GitHub App's `.pem` downloads to wherever your browser puts it, and it is
easy to file it "next to the project" — which on 2026-09-16 meant a folder
inside the checkout. It sat there untracked for about two minutes. Nothing was
staged and nothing was pushed, but `git add -A` was the very next command in
the lesson, and this repo pushes to GitHub.

Three things now stand between that and a leak, in order of how much they are
worth:

1. **The key does not belong on disk here at all.** It goes into Vercel and
   1Password and is then deletable; the base64 in the vault is the copy of
   record. Keep the `.pem` outside the repo, or nowhere.
2. **`.gitignore` covers `*.pem`, `*.key`, `*.p12`, `id_rsa*`.** A backstop, not
   a control — it only helps for names it recognises.
3. **GitHub secret-scanning push protection** would likely reject the push. Last
   line, and depends on GitHub recognising the format.

The general shape: a credential that arrives as a *downloaded file* behaves
differently from one that arrives as a *string to paste*. Every other secret in
this project was pasted straight into 1Password and never existed as a file. This
one has a physical copy by default, and the default location is wrong.

## Checking tools that pass green while blind

Three instances now, all the same shape, all found by accident. Treat a green
check as a claim about a specific scope, and go and read what that scope is.

- **`bin/preflight` checked two scopes out of seven** (lesson 07). Its list was
  hard-coded to lesson 04's. Fixed: it reads the required scopes out of
  `slack-app-manifest.yml`.
- **`bin/smoke` tests the lesson-04 bot.** Its five probes cover the mention →
  reply chain and nothing added since. Remove every reaction call, or the whole
  mrkdwn conversion, and it still passes 5/5.
- **`bin/smoke` probe 5 asserts a status code, not a reply.** It checks the
  endpoint returned 200, but `events.js` returns 200 for skipped events too — so
  it cannot tell a handler that replied from one that ignored the event, and it
  prints "posted into the thread above" either way. It also forges the mention
  text as a literal `<@bot>` rather than the real bot id, which is harmless only
  while the `app_mention` path ignores the text. Tighten that path to require a
  real id match and the probe breaks silently, still green.
  **It is most wrong when the bot is most broken:** every return path in
  `events.js` is a 200, including the one taken when `auth.test` fails and the
  handler refuses to dispatch at all. With a completely dead bot token, probe 5
  still prints that the handler replied. A probe whose claim is affirmatively
  false exactly when the system has failed is worse than no probe.
  **The fix, when someone takes it:** assert an outcome, not a status — read the
  thread afterwards and check a new message from the bot appeared under `rootTs`.
  Smoke already holds the token and the timestamp, so it is one
  `conversations.replies` call and a length comparison, and it makes the forged
  mention text irrelevant because it stops caring what the handler did internally
  and checks what landed in Slack.

- **A piped command reports the pipe's exit code, not the command's** (lesson 08).
  Checking `git push origin main 2>&1 | tail -2` asserts on `tail`, which exits 0
  whether or not the push was refused — so the check passes on a repository with
  no protection at all. Found in a probe written by Claude on 2026-09-16, minutes
  after documenting the same shape in `bin/smoke`. Drop the pipe and read the
  command's own status; if you need the output too, capture it separately.

The general rule: a tool that silently narrows is more dangerous than no tool,
because it answers the question you asked with the wrong scope of truth. When a
check passes after a change, ask what it would have had to see to fail.

## Slack traps found in lesson 07

- **A reinstall does not always mint a new bot token.** With
  `token_rotation_enabled: false` and a scope change on an app already installed
  in the same workspace, Slack widens the existing grant and the token is
  unchanged. Ray states rotation as certain; it is not. Check with
  `bin/preflight` rather than comparing tokens by eye — reading a secret to see
  whether it changed is still reading a secret.
- **`bin/preflight` passed green while blind to five new scopes.** Its scope list
  was hard-coded to lesson 04's two, so after the lesson-07 reinstall it
  confirmed a change it had never checked. Fixed 2026-09-16: it now reads the
  required scopes out of `slack-app-manifest.yml`. The general trap is worse than
  the instance — a checking tool that silently narrows is more dangerous than no
  tool, because it answers the question you asked with the wrong scope of truth.
- **A `url_private` download with insufficient permission returns HTTP 200 and an
  HTML sign-in page, not a 401.** Status-code checking sees success and hands the
  model a login form where the screenshot should be. Check `content-type`;
  `text/html` means a missing `files:read` or the bot not being in the channel.
- **`files.getUploadURLExternal` rejects a JSON body** with `invalid_arguments`.
  It needs form encoding, which is why `callForm` exists in `api/_lib/slack.js`
  beside the JSON `call`.
- **An @mention fires two events, and the obvious dedup drops images.** Both
  `app_mention` and a `message` twin arrive. Splitting on event type loses
  attachments, because `app_mention` carries `files` in practice but not by
  contract. Split on files instead: text-only mention → `app_mention`; mention
  with files → the twin.
- **Subscribing to `message.channels` makes the bot hear itself.** Unguarded it
  answers its own posts forever, booting a real sandbox each cycle. It never
  errors; it just spends. Three overlapping guards (`bot_id`, `subtype ===
  'bot_message'`, `user === BOT_USER_ID`) because Slack has more than one way of
  saying a bot wrote something. If it ever loops, turn off the `message.channels`
  event subscription in Slack — that stops it immediately, without a deploy.

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
