# Verifying a change to the bot

After any change that alters what the deployed bot does — and after the deploy,
not before. Cheap checks first, because they cost nothing and name the fault
more precisely:

1. `npm test` — the handler's logic, no network.
2. `bin/smoke` — the deployed endpoint, a signed payload, posts in `#bot-smoke`.
3. The end-to-end test below — the only one that proves Slack actually delivers
   a real mention and the sandbox actually answers.

## The end-to-end test
Post in `#joestar-test` (`C0C1QB5PCNB`) via the Slack connector, tagging the bot
as `<@U0C1T5AQ0G6>`, with a question whose right answer is obvious. Wait about
60 seconds, then read the thread.

- **Pass:** a reply from `joestar` in the thread containing a real answer.
- **Fail:** no reply at all; a reply still reading `_thinking…_`; or
  `Claude fell over: …`. A placeholder that never changes is a fail, not a slow
  pass.
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
