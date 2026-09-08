# Connecting to GitHub

- class: slack-agents
- chapter: 0 to 1
- title: Connecting to GitHub
- url: https://www.agenticcoding.school/v/nookfBQR
- durationSeconds: 369
- fetched: 2026-09-05
- transcriptChars: 5560

## Description (video page text, NOT transcript; may contain links)

1. Go to Settings → Developer settings → GitHub Apps → New GitHub App
  - Personal: https://github.com/settings/apps
  - Org-owned (preferred if the repos belong to an org): https://github.com/organizations/<ORG>/settings/apps
2. GitHub App name — must be unique across GitHub, e.g. joestar-bot. This becomes the commit author joestar-bot[bot].
3. Homepage URL — required but unused; your repo URL is fine.
4. Webhook — untick Active. You're calling the API, not receiving events; leaving it on makes GitHub retry failed deliveries indefinitely.
5. Repository permissions — set exactly these, leave everything else at "No access":

| Permission    | Level                | Why                           |
|---------------|----------------------|-------------------------------|
| Contents      | Read and write       | clone, commit, push           |
| Pull requests | Read and write       | open and comment on PRs       |
| Metadata      | Read-only            | mandatory, auto-selected      |
| Issues        | Read-only (optional) | only if it should read issues |

5. Where can this GitHub App be installed? → Only on this account
6. Click Create GitHub App
7. Note the App ID from the General tab
8. Scroll to Private keys → Generate a private key. A .pem downloads once and cannot be recovered — store it now.

B. Install it

9. Left sidebar → Install App → Install next to your
10. Choose Only select repositories and pick the specitories" — this selection is your blast radius.
11. Grab the Installation ID from the URL you land on:
  - https://github.com/settings/installations/1234567
  - Org: https://github.com/organizations/<ORG>/settings

C. Save the environment variables

12. **Base64 the private key.** The `.pem` is multiline, and multiline values get mangled on the way into env vars often enough that it's worth removing the ambiguity up front. The `tr` is what guarantees a single line — GNU `base64` wraps at 76 characters by default and the wrapping breaks the decode:

    ```bash
    base64 -i your-app.private-key.pem | tr -d '\n' | pbcopy
    ```

14. **Add all three to Vercel.** Either through the dashboard (Project → Settings → Environment Variables):

    | Variable | Value | From |
    |---|---|---|
    | `GITHUB_APP_ID` | numeric App ID | step 7 |
    | `GITHUB_INSTALLATION_ID` | numeric installation ID | step 11 |
    | `GITHUB_APP_PRIVATE_KEY` | base64 string | step 12 |

15. **Remember `GITHUB_APP_PRIVATE_KEY` holds base64, not raw PEM.** The name doesn't say so, so the function has to decode it before signing, and that should be commented where it happens:

    ```js
    // Stored base64-encoded to survive multiline env var handling.
    const privateKey = Buffer.from(
      process.env.GITHUB_APP_PRIVATE_KEY,
      "base64",
    ).toString("utf8");
    ```

    Note it in the README too. If someone later pastes a raw `.pem` into that variable, the decode silently produces garbage and the JWT signer throws `error:1E08010C:DECODER routines::unsupported` — an error that says nothing about the actual cause.

D. Pass this prompt to your agent:

```
# Give the sandboxed Claude Code agent short-lived GitHub access

This repo is a Slack bot: a Vercel function receives a Slack event, boots a throwaway E2B sandbox, and runs Claude Code inside it with `--dangerously-skip-permissions`.

READ the existing code first — `api/slack/events.js`, `lib/claude-sandbox.js`, `lib/slack.js`, `e2b/template.js`, and the README — before changing anything. Match the existing style and comment density.

## Goal

Let the agent do real GitHub work in response to a Slack message — clone a repo, branch, commit, push, open a PR, read issues — using a token minted fresh per request that expires in 1 hour.

## Threat model (assume this, don't soften it)

Anyone who can @mention the bot can run arbitrary prompts AND arbitrary code inside the sandbox. Guardrails inside the sandbox are defence-in-depth only; the boundary that actually holds is what GitHub itself refuses to do. Design accordingly, and don't write comments claiming more safety than the design provides.

## Set this up yourself before starting (it is not code)

Create a GitHub App, install it on **selected repositories only**, and generate a private key:

- Permissions: `contents` read+write, `pull_requests` read+write, `metadata` read. Deliberately NOT `workflows` (would let injected code rewrite CI and escalate into Actions secrets) and NOT `administration` (would let it remove branch protection).
- Add a ruleset on each default branch: PR required with 1 approval, force pushes blocked, deletions restricted, empty bypass list.
- Base64-encode the `.pem` to a single line before putting it in Vercel — multiline env vars do not survive the round trip cleanly:

      base64 -i your-app.private-key.pem | tr -d '\n' | pbcopy

Three env vars in Vercel:

| Var                      | Contents                                                                      |
| ------------------------ | ----------------------------------------------------------------------------- |
| `GITHUB_APP_ID`          | numeric App ID                                                                |
| `GITHUB_INSTALLATION_ID` | numeric installation ID (the number at the end of the install's settings URL) |
| `GITHUB_APP_PRIVATE_KEY` | the App's `.pem`, **base64-encoded, single line**                             |

## 0. The sandbox has no `gh`

`e2b/template.js` installs `curl`, `git`, `ripgrep`, and the Claude CLI — that's all. The GitHub CLI is not there, and it is not in the base image's default apt sources either, so `aptInstall(["gh"])` may not resolve. Add it via GitHub's own apt repo with `runCmd(..., { user: "root" })`, or install the release `.deb` directly.

**None of this works until you re-run `npm run template:build`.** The README already documents how a stale template of the same name silently shadows a new one — you will hit that here if you skip the rebuild. Verify inside a sandbox that `gh --version` and `git --version` both answer before debugging anything else.

## 1. Mint the installation token in the Vercel function

Put this in a new `lib/github.js`. It runs in the **function**, never in the sandbox — the App private key must not enter the sandbox. That separation is the entire point: the sandbox holds an expiring capability, not the thing that mints capabilities.

**Decode the key first.** Despite the variable name, the value is base64, not raw PEM:

    // Stored base64-encoded to survive multiline env var handling.
    const privateKey = Buffer.from(
      process.env.GITHUB_APP_PRIVATE_KEY,
      "base64",
    ).toString("utf8");

If the decoded value doesn't start with `-----BEGIN`, throw with a message saying the variable is expected to be base64. Otherwise you get an opaque OpenSSL `error:1E08010C:DECODER routines::unsupported` that points at nothing.

**Sign an RS256 JWT** with exactly three claims — `{ iat, exp, iss }`:

- `iat` ~60 seconds in the past, to absorb clock skew. GitHub rejects future-dated JWTs.
- `exp` no more than 10 minutes out. Use 9 to leave yourself margin.
- `iss` the App ID. (GitHub's docs now recommend the App's *client ID* here and treat the numeric App ID as the older form. Both work; the numeric ID is what the env var above holds, so use it — just know why the docs look different.)

Prefer Node's built-in `node:crypto` (`createSign("RSA-SHA256")` plus base64url encoding) over adding a JWT dependency. This repo has already been bitten once by an ESM-only package breaking Vercel's bundler; a ~15-line signer avoids repeating that. If you judge a library is genuinely worth it, say why before adding it.

**Exchange it** for an installation token:

    POST https://api.github.com/app/installations/{GITHUB_INSTALLATION_ID}/access_tokens
    Authorization: Bearer <jwt>
    Accept: application/vnd.github+json
    X-GitHub-Api-Version: 2022-11-28

That version header is not the newest — GitHub's REST API is date-versioned and the current release is `2026-03-10`. `2022-11-28` is still supported (through **10 March 2028**) and is what an unversioned request defaults to, so pinning it is a deliberate, stable choice, not a stale one. Pin it explicitly with a comment saying so; don't silently omit the header and inherit whatever the default becomes later. Check the current table at docs.github.com/en/rest/about-the-rest-api/api-versions yourself rather than trusting this brief — it will age.

The response gives `{ token, expires_at }`, one hour out. That lifetime is fixed and cannot be extended, which is fine — the sandbox lives minutes.

**Never log the token**, and never parse or assume its format or length. On a non-2xx, surface GitHub's own `message` field plus the status: `401` means a bad JWT or a skewed clock, `404` means the wrong installation ID.

**Fail soft.** If minting fails, the bot must still answer non-GitHub questions. Run without the token and have the Slack reply say GitHub access is unavailable — don't take the whole request down. Distinguish *not configured* (no GitHub App set up at all — stay silent, the feature is simply off) from *configured but broken* (say so in the reply). Otherwise every student without a GitHub App gets a scary warning on every message.

**Decide eager vs lazy minting and justify it.** Lazy means only minting when the request looks GitHub-shaped — which in practice means keyword-sniffing the prompt. Before choosing that, consider the threaded follow-up "now open a PR for that", which contains no keyword at all. Also consider where minting sits: it runs after the Slack ack, inside `waitUntil`, on a path that already takes minutes. Whatever you choose, say why. If you cache the token across warm invocations, say explicitly what that means for the "fresh per request" story.

## 2. Get it into the sandbox

- Pass it per command via `sandbox.commands.run(cmd, { envs: { ... } })`. Passing envs at `Sandbox.create` does **not** reach spawned processes — that lesson is already load-bearing for the Claude OAuth token. Do not regress it.
- Set `GH_TOKEN` (the `gh` CLI reads it automatically; no `gh auth login` needed, which matters because that command wants an interactive TTY).
- Also set `HISTFILE=/dev/null` so nothing lands in shell history.
- Everything Claude spawns inherits these. That's required for `git` and `gh` to work, and it means any code the model runs can read the token. Comment it honestly; don't pretend the env var is compartmentalised.

## 3. Let git use it without leaking it

- **`git` does not read `GH_TOKEN`.** It needs a credential helper. Two candidates: `gh auth setup-git`, or an inline helper configured yourself. `gh auth setup-git` is known to behave differently when auth comes from an env var rather than stored credentials, so **test both in a real sandbox and ship the one that actually works.** Don't assume, and don't ship the untested one.
- The inline form to test looks like this — note that what lands on disk is the literal string `$GH_TOKEN`, expanded only when git runs the helper:

      git config --global credential.https://github.com.helper \
        '!f() { echo username=x-access-token; echo "password=$GH_TOKEN"; }; f'

- **Do not embed the token in the remote URL** (`https://x-access-token:TOKEN@github.com/...`). It persists in `.git/config` in plaintext for anything later in the run to read.
- Do not pass the token as a command-line argument — it's visible in `ps`.
- `git commit` fails outright without `user.name` / `user.email`. Set them from env vars; the exact values don't matter for this task.
- Confirm `HOME` is the same for your setup command and for the `claude` command, or `--global` config written by one won't be seen by the other.

## 4. In-sandbox guardrail: one narrow PreToolUse hook

Add exactly one hook, and be honest in its comments about what it does and doesn't do.

**What it blocks:** destructive `git push` refspecs — `--force`, `-f`, `--force-with-lease`, `--delete`, `-d`, a leading `+` in a refspec, and colon-delete (`git push origin :branch`). Consider `--mirror` and `--prune` too: both delete remote refs, so they belong to the same capability. Exit code 2, with a stderr message the model will read: "Force-push and branch deletion are disabled. Push a new branch and open a PR instead."

**Why only this:** the branch ruleset protects the default branch only, so `contents: write` can still force-push over or delete any other branch. That's the one destructive capability GitHub permits and nobody wants. Everything else is either already refused by GitHub (protected main, `.github/workflows/`) or unenforceable by string-matching (token exfiltration via `curl`/`python`/`nc`/an attacker-controlled remote — `X=$GH_TOKEN` alone defeats any pattern you write).

Do NOT add a general dangerous-command denylist. The sandbox is a throwaway container killed after every run; `rm -rf` inside it costs nothing, and a denylist that stops the obvious cases while missing the non-obvious ones is worse than none because it reads as protection.

**Implementation notes:**

- Config schema is `"hooks": { "PreToolUse": [ { "matcher": "Bash", "hooks": [ { "type": "command", "command": "..." } ] } ] }`. Write it to the sandbox user's settings file (`~/.claude/settings.json`), and add *only* the `hooks` key — this repo has already been burned by a baked-in `apiKeyHelper` in that same file overriding `CLAUDE_CODE_OAUTH_TOKEN`.
- The hook receives tool input as **JSON on stdin** — parse it. Do not expect template arguments.
- There's no `jq` in the image, but there is Node. Write the hook in Node and keep its source as an exported string in a module rather than a file read at runtime, so Vercel's bundler can't leave it behind.
- Exit 2 blocks and feeds stderr back to the model; exit 1 does not block. The docs also describe an exit-0-plus-JSON form — pick one mechanism, not both, because JSON is ignored on exit 2.
- **Verify empirically whether the hook fires at all under `--dangerously-skip-permissions`, and report what you observe.** The docs say PreToolUse runs before the permission prompt for every tool, and the hook payload can carry `permission_mode: "bypassPermissions"`, which implies it does fire. But there are open reports claiming the flag skips the hook layer entirely, and older ones where the hook fired asynchronously and the command ran anyway. This cannot be settled by reading. Test it, state the version you tested on, and treat the hook as a nudge either way.
- One thing that *is* documented and worth knowing: `permissions.deny` rules apply in **every** mode including `bypassPermissions` (only `allow` rules become no-ops there). So if the hook proves inert, a single narrow deny rule is the documented fallback — same one guard, not a denylist. Propose it, don't add it unasked.
- Comment plainly that the hook is defeatable — an alias, a shell function, indirection like `G=push; git $G --force`, or invoking `git-receive-pack` directly all walk straight past a string match. It prevents an agent's bad decision, not an attacker's.

## 5. Update the README

Document the three env vars, that `GITHUB_APP_PRIVATE_KEY` holds **base64** and must be decoded, the App permissions to grant (and the two to withhold, with reasons), the required branch protection, and the template rebuild. Keep the existing config table format.

## Gotchas to handle or document

- `gh pr create` fails unless the branch is already pushed to the remote.
- Get the PR base branch right; don't assume `main` — read the repo's actual default branch.
- GitHub secret-scanning push protection will block a push containing a token.
- An expired token returns `401` — fail loudly and legibly rather than mysteriously.
- E2B allows outbound network by default, so token exfiltration via `curl` is possible. Note this limitation honestly rather than implying it's solved.
- Tell the model in its prompt what it can and cannot do (branch-and-PR only, no force-push, no `.github/workflows/`, token dies in an hour). Otherwise it burns minutes rediscovering the walls by hitting them.

## Constraints

- No hardcoded repo names, org names, App IDs, or installation IDs anywhere in the code — everything through env vars, with placeholders in the README.
- Do not weaken or remove the existing Slack signature verification, the loop/dedup guards, the thread-transcript replay, or the per-command env pattern.
- Do NOT commit, push, or deploy. Show me the diff and wait.
```

## Transcript

Okay, so one of the most important abilities for our Slack bot is to give it access to GitHub. So it can pull in any repos, make changes, make commits, and also open up pull requests for any changes. Now there is a non-safe way of doing it, which is much faster, and there is a safer way of doing it. And I'll be going through the safer way. And by the way, the non-safe way of doing this is basically going into developer settings and then going to personal access tokens and making one for the bot. And the safer way is actually going ahead and creating a GitHub app.. And this is pretty similar to like any cloud app that you may have installed to your GitHub so it can access your repos. So we're going to be making one ourselves by basically following the instructions down below. So this will be down below as well. So you can click on the links and stuff. So first of all, we will go to developer settings and make a brand new app over here. So it should look kind of like this. So I will call it joestar-bot over here. And for the homepage URL, you can put in anything. So it can be your, like web address or just a random domain that you own. But it doesn't matter because no one is going to be using this except for us. For the webhook over here, we can untick the active because we will not be receiving any requests from the GitHub app. For the permissions over here, we want to give it a couple of permissions. So we will give it permissions to contents. So contents, this will be read and write. Then go to pull requests. So let me search for that. This will be read and write as well. Then for metadata. So metadata over here. Mandatory, this is read-only. I will make it read-only, but you may want to make it read and write if you want the bot to also make issues as well. And then you may want to look through anything else over here that you may want to give your bot permission to based on the workflows that you use and manage yourself. So I will press save, but I would recommend discussing it with Claude Code first because some of these could pose some kind of safety risks as well. And I should have actually added HTTPS to the homepage URL. Press create GitHub app. And now we have the app ID over here and we got to create a new private key to install the application. So pressing create new private key over here, it will scroll us down to the very bottom where it says private keys. Press Generate a private-key, and that will be saved locally on our machine as a .PEM file. So we'll come back to that file later. Now we want to press Install App over here and then click on ourselves or our own organization and press Install. And then you can choose either some repos or you can choose all repos. So I will do Install over here. And now it is installed for us personally. Now in the URL, we have the installation ID over here.. So we gotta make sure we keep this ID safe. And now we can go back to Vercel and set these environment variables. So if I then go back, uh, to settings over here. So if I then go back to Vercel, go to environment variables, I can add a couple ones over here. So we have the GitHub app ID. Now we have the app ID. So let me go back to the app by pressing app settings. And here it says app ID. So the key the key over here will be github_app_id. The value will be this app ID over here, and we can mark this as non-sensitive. And then finally, and then finally we will have this sensitive one, which is github_app_private_key. And now one thing we got to do for our private key is base64 this. So this command will be down below, and you basically want to give it your file path. To the private-key that you saved locally. So it should look kind of like this. So it says base64 -i, the file path, and then it will say pbcopy. Pressing enter. This will now be copied to our clipboard so we can then paste it into here. And for the value, it will look something kind of like this. So it looks like a bunch of random strings, a couple of lines long. This will be sensitive. Then we can press save. And now finally at the very bottom of the instructions, there will be a prompt kind of like this, which will basically set this up for you whereby, whereby every time you trigger a brand new thread, it will mint a brand new token using the GitHub application that we installed earlier that is short-lived and allows it to clone a repo, commit, push, and also open PRs as well. So let's copy over this prompt and then go to a brand new Claude Code session. Paste it in, and then it will start making the changes to our agents on our behalf. So to quickly go over what will happen is we have something where it will mint an installation token in the Vercel function, and that will be passed over into sandbox. And then the sandbox will have some guardrails to prevent it doing like force-pushes or deleting stuff, doing any dangerous GitHub Actions. It basically prevents it from doing any dangerous Git Actions on the sandbox. And then finally we'll update the README as well with this. So I'm basically going to come back to the video once this is implemented. Okay, so now that Claude said that it finished building out this feature, we can basically tell it to test the feature by getting a real project and then making like a tiny commit or a tiny like blank change to it to see if it works end to end. So I'm basically going to say, okay, cool, can you basically use the test channel to tell it to pull the repo from, which is agentic-coding-school, and then just make a blank empty commit and then verify it did it successfully. And now it sent a test message on Slack. So it basically said do a GitHub smoke test. And now it's gonna actually test it out and see if it works properly. And it said like smoke test complete, all of this is working. So we've basically gone through the entire process. Of allowing our Slack Bot agent to now securely connect to our GitHub repos and also make changes, make new branches, do commits, and open up PRs, which means that now we can do a lot of our coding work on the cloud instead. So in the next video, we will be going over how we can give us specific tools, such as handling voice messages, for example.
