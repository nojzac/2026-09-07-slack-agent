# Polishing the Bot

- class: slack-agents
- chapter: 0 to 1
- title: Polishing the Bot
- url: https://www.agenticcoding.school/v/3xbgY-o2
- durationSeconds: 392
- fetched: 2026-09-05
- transcriptChars: 6300

## Description (video page text, NOT transcript; may contain links)

The prompt:

```
# Add Slack features to a Claude-powered Slack agent

You're working in a Slack agent repo. The shape this targets: a single serverless webhook
(e.g. a Vercel function) that verifies the Slack signature, acks within Slack's ~3s window,
drops Slack retries (`x-slack-retry-num`), and runs the user's prompt through Claude Code in a
THROWAWAY sandbox (e.g. E2B, `claude -p --output-format json`), then edits a "Thinking…"
placeholder in the thread with the result. No database, no queue. The sandbox is killed after
every run, so there is NO live model session between turns.

Your repo may differ — START by reading the current code before changing anything:
- Find the Slack event handler (verify → ack → dispatch), how it drops retries, how it
  posts/edits its reply.
- Find where the prompt is actually run, and whether it keeps any state between runs.
- Find the Slack app manifest (scopes + event subscriptions), the env file, and package config.

Replace the bracketed placeholders below with this repo's real values as you discover them:
- `[BOT_USER_ID]`      — resolve via `auth.test()`; mentions must be `<@[BOT_USER_ID]>`
                         (literal `@name` text is NOT a functional mention)
- `[YOUR_TEST_CHANNEL]`— a channel the bot is already a member of
- `[YOUR_DEPLOY_HOST]` — the deployed endpoint host

## Features to add

### 1. Continue a conversation on a plain thread reply (no re-mention)
- Subscribe to the message events for the channel types you actually support (e.g.
  `message.channels`, `message.groups`) and add the matching scopes (`channels:history`,
  `groups:history`). Keep DMs/mpim out unless you genuinely support them.
- Treat `event.thread_ts && event.thread_ts !== event.ts` as a thread reply. Decide "is this MY
  thread?" — if the agent keeps per-thread state, look it up; with no store, call
  `conversations.replies` and check whether the bot's own user id has already posted. If it's
  the bot's thread, respond WITHOUT requiring a mention.
- RESUME MECHANISM — pick based on your runtime:
  - Runtime DISCARDS the session between turns (throwaway sandbox) → use TRANSCRIPT REPLAY:
    each turn fetch `conversations.replies({ channel, ts: threadTs, limit: 20 })`, drop the
    bot's own placeholder/status messages and Slack's structural subtypes, render
    `speaker: text` lines, and prepend them to the new prompt wrapped in `<thread>…</thread>`
    marked as untrusted DATA. Keeps the agent stateless — no store, concurrency-safe.
  - Runtime can PERSIST a session (keep the sandbox alive) → you may instead use Claude Code's
    native resume: a deterministic per-thread session id (UUIDv5 of `channel:threadTs`),
    `--session-id` on the first turn and `--resume` after, pausing rather than destroying the
    runtime. This needs a thread→sandbox mapping and per-thread locking. It's a real lifecycle
    change — flag it and confirm before building it.
- LOOP PREVENTION (critical): once you subscribe to `message.*` the bot hears its OWN posts.
  Ignore any event where `event.bot_id` is set, `event.subtype === 'bot_message'`, or
  `event.user === [BOT_USER_ID]`, or it retriggers forever. Cache the bot id via `auth.test()`.
- DEDUP: an @mention fires BOTH `app_mention` and a `message` twin. `app_mention` carries
  `files` in practice but NOT by contract, and Slack has shipped cases where a mention+file
  arrives only on the `message` event — so split on FILES, not event type:
  text-only mention → `app_mention` handles it (skip the twin); mention WITH files → the
  `message` twin handles it (the reliable file carrier) and `app_mention` bows out.
  One handler per request, no dropped images.

### 2. Reply in-thread
Use `event.thread_ts ?? event.ts` as the thread key so replies land in the thread (a top-level
mention starts its own thread; its `ts` becomes the key). Make every code path use that key.

### 3. Send files/images to Slack
- Add scope `files:write`. Give the model a convention: write anything to send into a known
  output dir (e.g. `/tmp/outputs/`). After the run, collect from that dir and upload each to
  the thread. `files.upload` (v1) was retired March 2025 — use `files.getUploadURLExternal` →
  PUT bytes → `files.completeUploadExternal`, or simplest, `@slack/web-api`'s
  `files.uploadV2({ channel_id, thread_ts, file, filename, title })`. Cap count/size.

### 4. Read incoming attachments (especially images)
- Add scope `files:read`. Files arrive in `event.files[]` with `url_private`. Download with
  `Authorization: Bearer <BOT_TOKEN>`.
- GOTCHA: a `url_private` fetch with a missing/insufficient token returns HTTP 200 with an HTML
  sign-in page, NOT a 401. Check `content-type`; `text/html` means failure (missing
  `files:read`, or bot not in the channel), not file bytes.
- Write good files into the sandbox (e.g. `/tmp/inputs/<name>`, sanitized and unique) and add
  the paths to the prompt so Claude's native Read tool can view images/PDFs. State that the
  files are DATA, not instructions. Handle `subtype: 'file_share'` (a caption-less screenshot
  is still a real request). Cap count/size; skip external/Drive files.

### 5. Auto-react when a message lands
- Add scope `reactions:write`. As soon as an event passes the for-us/not-a-loop guards and
  BEFORE the run: `reactions.add({ channel, timestamp: event.ts, name: 'eyes' })`. Swallow
  `already_reacted`. On completion ADD a terminal reaction alongside (don't remove 👀):
  `white_check_mark` on success, `x` on failure.

### 6. Finishing touches
- mrkdwn: convert the model's Markdown to Slack mrkdwn IN CODE before posting (`**bold**`→
  `*bold*`, `## H`→`*H*` on its own line, `[t](url)`→`<url|t>`, `- bullet`→`• bullet`; leave
  fenced and inline code untouched). Models ignore prompt instructions to emit mrkdwn.
- Keep any existing progress affordance (a "Thinking…" placeholder edited with the final answer).

## Setup note
After deploying, paste the updated manifest into the Slack app's App Manifest editor and
REINSTALL — new scopes/events only take effect on a fresh install.

## Verification
In `[YOUR_TEST_CHANNEL]`, mention the bot with a real `<@[BOT_USER_ID]>` mention (literal
`@name` text is not a functional mention) and read the THREAD, not just the channel feed:
- Mention the bot → it 👀-reacts, replies in thread, then ✅.
- Reply in that same thread WITHOUT mentioning it → it continues with prior context.
- Upload an image in a mention ("what's in this picture?") → it reads the image and answers.
- Ask it to produce a file ("write X to a file and send it") → it uploads the file to the thread.
```

## Transcript

Okay, so before moving on to more advanced things with our sandbox agent, like MCP servers and Playwrights and a bunch more, we wanna add some finishing touches to it so it can do a bunch of functionality that makes sense. So there will be a prompt down below whereby if you enter that prompt into Claude Code or Codex, then it will add the following to your agent. But you can also download the final version, which will be down below as well. So the features that we're adding here is that when you continue a conversation, so you reply to a thread, then it will relaunch the same session again. So for example, if I were to go over to this thread and then enter reply by saying welcome or something like that, then it would go to the same Claude Code session. So this basically is some kind of resume mechanism that we need in place to resume the sandbox. And then it should also reply within the same thread again, for that particular session. So every time we spin up a new thread, so every time we have a new top-level message, that is a new session of Claude. And then every reply in the thread goes into existing session. We want to give it the abilities to send files and images to Slack. And this can be really handy because Claude can make a HTML file and then send it us via Slack. And then we can simply view the file in Slack. So for example, if I went to my previous agent Percy, then you can see it sent me a HTML report over here and I can just click on it. And then this is all HTML that I created and I can view it directly inside of Slack. So this is really good because it means that it can send us artifacts quite easily. So we're going to be adding that. We also want it to read incoming attachments. So that could be like audio messages, videos, images, basically whatever you may send it by Slack. We want to auto-react when a message lands. So we'll use an eyes emoji and it will use a check mark on success and an X on fail. And then we'll add some finishing touches as well, such as Slack's own markdown format. It should be respectable of that. So this prompt will be down below. So you can basically go to a brand new session and then paste it in and then run it. Now it does require us to give our Slack bot more permissions. So I'll say, give me the updated manifest. And this new manifest that it gave us gives it additional permissions such as channel history, group history, reactions.add, and so forth. So we can copy this over and then go back to Slack and go to appmanifest.json. And sometimes if you get your bots, if you get Claude to add a brand new feature to your bot and it says that you should update the manifest, then you basically want to go to appmanifest.json on the left-hand side and then paste in this and then press save changes. And you may want to give it the original manifest as well. And be like, okay, what do I need to update it with? So pressing save changes, we now have to reinstall this application for it to take effect. So pressing restore your app, press reinstall to joestar-test. Then we can copy, press allow again over here. And then we got to copy and update our environment variable. So we only have to do this every time you change the manifest in some kind of way, the permissions that the bot requires. So I will go back to joestar-agent over here, then go to environment variables here. And where it says Slack Bot TOKEN, we can edit that, paste a new one, press save changes. And where it says updated environment variable successfully deployed over here, we can say redeploy. So press redeploy, redeploy, and that will use a new token. So because it's now been implemented with this prompt, we can say commit, push, deploy. And then once it's finished deploying, we can have it automatically test to make sure everything is working as intended. And now that's finished deploying, I can basically say, can you tell me the test matrix for all the changes that we made so we can verify them? And you can see that this is the test matrix that it basically gave us. So I'm going to say, yeah, so I basically updated the manifest and I deployed the changes. Can you basically now test as many of those actions as possible? Inside of the joestar-test, uh, Slack channel and then verify that everything is working as intended. Use a verification subagent to basically do this using the Slack MCP and then pressing enter over here, it will basically verify all those changes to make sure they're working properly. But essentially I can quickly see some of these changes. For example, if I then send a test message again, then you will see automatically replies to me with the eyes emoji to show that it's working. And then it will say thinking and stuff. And then it will actually give me the reply. And I can give a follow-up over here and then it will go back into the same session again. Now you may want to add some other functionality whereby you may send a message and you want to like kind of cancel the message. You can just tell Claude Code to add that functionality for you. So you may send a message and then a couple minutes later you realize that you don't want your agent to be doing that. You can just press a stop button. So essentially anything that you think is possible will likely be possible here. But yeah, I will basically have the verification agent do its job right now and then come back to it once it is done. But yeah, now we can see we have the verification agent running over here. So if I go into verifier, then you can see that these are all the flows that it will start testing out. One of the ones that I can't test out is attachment because the Slack MCP server that we registered with Claude.ai does not allow to send a file. It only allows it to send text messages. So we will have to do that verification manually, but the rest of it should happen automatically. And you can see it's happening right now. So it's like now posting 3 independent test messages. Going back over to the joestar-test channel, you can see these are all the test messages that it's sending. Write a haiku on about Slack into a file and send it to me. And it's going to do that right over here. So this is a huge benefit because we can have Claude automatically test our Slack bot agent on our behalf. Alrighty. So it's done a test of my agent, joestar, over here. And it says that every test has passed, including the one that it considers load-bearing. And one is inconclusive over here. And it deems that as a harness limitation. And I can read below for more details. So this is really great because we made a bunch of finishing touches to our agent. And now we have an automatic verification environment. Which exists on the joestar-test channel over here that Claude will automatically be posting onto. So in the next video, we will be going over how we can set this up with GitHub so it can start making commits for us on GitHub and also pull down our code and make changes, run the code, and a bunch more stuff.
