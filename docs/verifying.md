# Verifying a change to the bot

After any change that alters what the deployed bot does — and after the deploy,
not before. Cheap checks first, because they cost nothing and name the fault
more precisely:

1. `npm test` — the handler's logic, no network. Since lesson 07 this pins the
   loop guards, the dedup split, "leaves someone else's thread alone", the
   HTML-sign-in-page trap, and that an upload filename cannot escape its
   directory.
2. `bin/smoke` — the deployed endpoint, a signed payload, posts in `#bot-smoke`.
3. `bin/preflight` — read-only, about 20s. Checks the bot token and every scope
   named in `slack-app-manifest.yml`. Use it after any manifest change or
   reinstall; it is also how you tell whether a reinstall rotated the token,
   without anyone reading the token.
4. The end-to-end test below — the only one that proves Slack actually delivers
   a real mention and the sandbox actually answers.

## The end-to-end test
Post in `#joestar-test` (`C0C1QB5PCNB`) via the Slack connector, tagging the bot
as `<@U0C1T5AQ0G6>`, with a question whose right answer is obvious. Wait about
60 seconds, then read the thread.

Since lesson 07 the bot does five things, not one, so a pass means five things.
Ask a question that exercises formatting — "in two sentences, …, use `code` for
one term" — then reply **without** mentioning it.

| Check | Pass |
| --- | --- |
| It heard you | 👀 on your message, within a second or two |
| It answered | a real reply from `joestar`, in the thread |
| It finished | ✅ alongside the 👀 — not replacing it |
| It formatted | bold renders as bold; no literal `**asterisks**` |
| It remembered | a plain thread reply, with no mention, gets an answer that uses the earlier turns |
| It stopped | exactly one reply per question, then silence |

The last row is the one that cannot be unit-tested, because the loop only exists
once `message.channels` is live. **A second, unprompted reply is an emergency,
not a quirk** — turn off the `message.channels` event subscription in the Slack
app immediately, which stops new events without waiting for a deploy, then fix
the guard.

Prove "it remembered" with something only the transcript can answer — "which word
did you put in backticks earlier?" — not a question the model could bluff.

- **Fail:** no reply at all; a reply still reading `_thinking…_`;
  `Claude fell over: …`; 👀 with no answer ever following (the run died after the
  guards); literal asterisks (the mrkdwn conversion did not run); or a thread
  reply ignored (the thread path did not fire). A placeholder that never changes
  is a fail, not a slow pass.
- **On a fail:** do not retry blindly. Read the Vercel logs for the function.
  `[claude] failed:` names the reason; its absence means the event never arrived,
  which is a Slack-side problem — bot not in the channel, message not actually
  tagging it, event subscription off, or the saved URL pointing at an old
  deployment. Report which link broke; fix, redeploy, re-test.

## Two things to know
It posts **as Noj**, not as the bot — the connector acts with his Slack account,
which is also why it works, since `events.js` ignores mentions carrying a
`bot_id`. And it costs a real sandbox and real Claude usage each run, so it
belongs after a deploy, not after an edit.

Timing cannot be read from the thread: the answer replaces the placeholder in
place, so the reply keeps the placeholder's timestamp. For how long it took, use
`[claude] answered in X ms` in the Vercel logs.

`#joestar-test` belongs to the Claude Code on Noj's machine. Keep testing noise
there, and keep it separate from `#bot-smoke`, where `bin/smoke` posts.
