> Correction added 2026-09-06 after this was written: the "no public GitHub URL" conclusion below is wrong. The MCP get_video "downloads" field, which the transcript cache omitted, links to https://github.com/ray-amjad/slack-agent-course (public, one tag per lesson, branches lesson-02 to lesson-15). The verdict "gives most of the plans" stands and is now stronger: the plans are public.

# Does Ray Amjad's slack-agents course give the build plans?

Source: the 21 cached transcripts in `autonomy/transcripts/slack-agents/`. Transcripts only, no web access.

## Verdict

**The course gives most of the plans, with these gaps: the artefacts live behind the course paywall rather than on public GitHub, the Slack app manifest is never published as a file, and the last four lessons are concept talks with no code.**

The earlier claim that "Ray publishes nothing, so you would be building from a video, not a repo" is wrong. Every lesson has a Downloads tab carrying a diff and a full repo snapshot, and several lessons ship multi-page engineering briefs as copyable prompts. The user is substantially right. But "repo" here means a per-lesson zip and snapshot served to enrolled students, not an open repository anyone can clone.

## What the viewer actually gets

- **Per-lesson downloadable code.** Lesson 02 states it plainly: "when you go to downloads over here, you can see that there is a link where it's what changed in this lesson and also the repo at the end of the lesson." Lesson 04's description says "The code at the end of this video is in the `Downloads` tab as a zip", and in the video: "the code will be down below for the final version that we just made. So you will be able to download that code as well if you want to skip this step."
- **Copyable prompts, often very long.** Lesson 07's description is a full feature brief covering thread continuation, transcript replay, loop prevention, the `app_mention` versus `message` dedup rule, `files.uploadV2`, the `url_private` HTML-instead-of-401 gotcha, and mrkdwn conversion. Lesson 08's is longer still, including the JWT claim set, the base64 private-key command, and the PreToolUse hook design. Lesson 15's memory brief names the exact settings keys `autoMemoryEnabled` and `autoMemoryDirectory` and pins the CLI at 2.1.216. Lessons 11, 14 and 16 also carry verbatim prompts.
- **Click-by-click console setup.** Lesson 08's description is a numbered GitHub App walkthrough with a permissions table (Contents read+write, Pull requests read+write, Metadata read-only), webhook unticked, "Only on this account", where to read the App ID and installation ID, and the three Vercel variables.
- **Named third-party pieces.** Slack workspace creation (link in lesson 03), the Slack API app-from-manifest flow, e2b.dev and its Claude Code template (linked in lesson 05), `claude setup-token` for the OAuth token, and the four environment variables enumerated on camera: signing secret, bot token, Claude Code OAuth token, e2b API key.
- **A closed test loop.** Lesson 06 builds it: a dedicated test channel, the Claude.ai Slack connector, and a CLAUDE.md verification step so Claude can post as you and read the bot's replies.

## The honest case against "full plans"

- **Most steps are Ray prompting Claude, not typing code.** Lesson 04: "Can we make a really simple Slack bot here that we will be deploying to the Vercel whereby when I tag it, then it will automatically reply to the message in the thread with a random number." Lesson 12 is a single sentence: "for the sandbox template, can you add Postgres and also Redis and then build the sandbox image and deploy it?" You are watching a prompt-driven build, so your generated code will differ from his.
- **The Slack manifest is never shown.** It is always "give me a manifest", copy from Claude, paste into Slack. Lesson 09 ends with him asking for an updated manifest as a JSON file. No canonical scope list is published in a transcript.
- **Debugging is skipped or hand-waved.** Lesson 05 hits an error and resolves it off camera: "after a bit more back and forth, Claude found the issue, which was a stale template." Lesson 13 picks "approach 3" from options the viewer never sees. Lesson 12 admits a wrong claim about where the image builds.
- **The snapshots are his machine, not yours.** Lesson 06: "some things may be specific to my particular computer and you will have to tell Claude to automatically update it."
- **The last four lessons are pure concept.** Lessons 19, 20 and 21 (on-call agents, task versus ownership delegation, feedback channels) have no code and no downloads. Lesson 19's only artefacts are Anthropic's blog post and starter kit. Lesson 21's advice is literally "copy the transcript for this video, give it to your Slack agent."
- **His production bot is not the one being built.** Percy has features shown but never built: rotating multiple Claude Code OAuth tokens on weekly-limit errors, scheduled routines, a cancel button. Those are described as things you could ask for.

## Is there a public repo of the finished bot?

**No.** No transcript names a public GitHub URL for the Slack agent. The artefacts are the per-lesson zips and repo snapshots on the course site's Downloads tab, reachable also through the class MCP server, which lesson 02 says returns "the download links for what exactly changed and the repo at the end of the lesson." Ray's own agent, Percy, is private, and the bot built in class, Joestar, is pushed to "a private GitHub repo" (lesson 04). The only public GitHub links in the whole course belong to other people: `github.com/block/buzz` and `github.com/anthropics/oncall-kit`. The memory store repo in lesson 15 is created private on camera.
