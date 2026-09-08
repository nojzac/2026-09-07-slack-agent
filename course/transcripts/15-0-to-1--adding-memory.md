# Adding Memory

- class: slack-agents
- chapter: 0 to 1
- title: Adding Memory
- url: https://www.agenticcoding.school/v/UyuD7cYj
- durationSeconds: 235
- fetched: 2026-09-05
- transcriptChars: 4319

## Description (video page text, NOT transcript; may contain links)

```
# Prompt: build long-term memory for a Slack agent

Give this agent long-term memory that survives beyond a single sandbox and a single Slack
thread. Read the repo first and tell me your plan before writing any code.

## The one design constraint that matters

Use **Claude Code's own native auto-memory feature**. Do NOT build a memory skill, a recall
endpoint, an embedding/vector store, a database, or a "load memory into the prompt" step. The
harness already loads a `MEMORY.md` index at session start, decides what is worth saving,
writes topic files, and curates them when they grow. Our job is **only the git plumbing and
one settings file**. Anthropic's own Slack product converged on exactly this shape (markdown
files in a per-scope directory, bounded index, topic files read on demand, synced to a remote
store) — so a custom layer would be a worse copy of something we get for free.

## Mechanism

**1. Provision, when the sandbox is created.**

- Clone a private git store from `owner/repo` in env `AGENT_MEMORY_REPO` into
  `$HOME/.agent/memory` — under `$HOME`, **not `/tmp`**, so it survives a pause/resume or
  any container step that wipes tmp.
- Skip the clone if `.git` already exists, but **unconditionally re-set `origin`'s URL**, so
  changing `AGENT_MEMORY_REPO` reaches boxes cloned from the old one.
- If the path exists but is not a repo, **move it aside** (`.broken`), never `rm -rf` — an
  un-pushed commit surviving to the next turn is the self-healing story.
- `mkdir -p <store>/<channel-id>`. Key the directory by **Slack channel ID, not channel
  name** — names drift, IDs don't. Strip `[^A-Za-z0-9_-]` from the ID before using it as a
  path segment. If nothing is left after stripping, **disable memory** rather than letting
  the path collapse to the store root (that would point auto memory at every channel at once).
- Read-merge-write `~/.claude/settings.json` with `autoMemoryEnabled: true` and
  `autoMemoryDirectory: <the channel dir>`. **Never clobber that file** — the harness edits it
  itself when curating, and other features write to it too. Set it at **user scope**
  (`~/.claude/settings.json`), not project scope: a project-scoped `autoMemoryDirectory` is
  only honoured after a workspace-trust prompt that a headless sandbox can never answer.

**2. Sync, around every turn.**

- `git pull --rebase --autostash` **before** the agent process spawns — the harness loads the
  index at process start, so a pull afterwards is too late.
- `git add -A`, commit, `git push` at the **single exit choke point** every path funnels
  through (success, error, timeout, stopped) — and **before** whatever tears down or pauses
  the sandbox, or the push races the box being frozen.

## Failure modes to handle explicitly — each of these was a real bug

- **A memory failure must never cost a turn.** Best-effort everywhere, log every outcome, and
  never let a git step throw into the turn's control flow.
- **On EVERY failure path, write `autoMemoryEnabled: false` explicitly, and delete
  `autoMemoryDirectory`.** The CLI default is ON. A failed clone that just returns early leaves
  the agent happily writing memories into a local per-sandbox directory that nothing ever
  syncs — the feature looks like it works and silently fails at the only thing it exists for.
  This is the single most important line in the whole feature.
- **Bound the entire sync** at ~40s shared across every git step in one call. Out of budget ⇒
  return a synthetic failure instead of spawning, so callers take their normal "that step
  didn't work" branch. This runs synchronously in front of the reply; it needs a ceiling.
- **Refuse to commit a conflicted tree.** Check for `.git/rebase-merge` / `.git/rebase-apply`,
  and for unmerged XY codes in `git status --porcelain` (`DD AU UD UA DU AA UU`). Otherwise
  `add -A` stages `<<<<<<< HEAD` into a memory file, pushes it, and every future thread in
  that channel loads the conflict markers as fact.
- **`add -A`, not `commit -a`** — a brand-new memory file is untracked, and that is the common
  case here.
- **Pass the commit identity with `-c user.name` / `-c user.email`** at commit time rather than
  relying on repo config, which a box provisioned by an older deploy may not have.
- **Push rejected ⇒ one `pull --rebase --autostash` and retry once.** If that loses too, leave
  the commit local: the next turn's pull carries it forward. Nothing is lost either way.
- **Credentials: a repo-local git credential helper that MINTS a short-lived token at git
  time**, pinned to the memory repo with an explicit `--repo`. Never put a token in the clone
  URL or `.git/config` — the sandbox can live for days and that credential would sit in it.
- **The clone must be owned by the user the agent runs as**, not root, or every push fails.
- **Unset `AGENT_MEMORY_REPO` ⇒ skipped, not broken.** That is also the kill switch: unset it,
  redeploy, memory stops. It must still write `autoMemoryEnabled: false`.
- If there is a provisioning version/stamp mechanism, **fold the repo slug into it**, so
  setting or changing the variable reaches already-provisioned sandboxes.
- **Do not pass `--bare`** to the `claude` invocation — it explicitly skips auto memory. Also
  make sure `CLAUDE_CODE_DISABLE_AUTO_MEMORY` is not set anywhere.
- **Pin the Claude Code CLI at 2.1.216 or later** — the `MEMORY.md` size-limit checks,
  frontmatter handling, and `modified` timestamps landed across 2.1.210–2.1.216.

## Two tiers, not one

Per-channel alone fragments: the same fact gets relearned in every channel. Mirror what
Anthropic's Slack product does:

- **Public channel** → reads a shared workspace directory *and* its own; may write to either.
- **Private channel** → reads the shared directory **read-only**, writes only to its own silo.
- Memory does not move if a private channel is later made public.
- Nothing is keyed to an individual user.

## Prompting: a disposition, not a skill

Auto memory is deliberately sparse — it "doesn't save something every session." With zero
prompting it writes almost nothing. Fix that in `--append-system-prompt`, **not** a skill: a
skill only loads once the model has already decided memory is relevant, which is the exact
judgement that isn't happening. Keep it to a few sentences covering:

- what is durable (repo gotchas, decisions, standing preferences) vs what is not (this turn's
  state, transcript detail) — memory is a curated note, not a transcript;
- the user idioms `remember for this channel: …` and `what do you remember about this
  channel?`;
- after being corrected, record the correction.

Keep entries short: long ones crowd out everything else, and editing `MEMORY.md` invalidates
the prompt cache from the injection point, so each write has a real token cost.

A skill *is* the right shape for **curation** — a user-invoked "prune and reorganise this
channel's memory" task (merge duplicates, drop stale entries, keep the index under ~200 lines
/ 25KB, commit). Build that separately, after the writing works.

## The store repo

Private. A `README.md` explaining the layout, and a `.gitattributes` with `*.md merge=union`
so concurrent writes from two threads merge instead of conflicting. If auth is via a GitHub
App, **the App must be installed on the store repo** or memory commits locally and never
pushes — with no error anyone notices.

## Verify it end to end, don't just ship it

1. In a test channel, tell the agent to remember a distinctive fact.
2. Check the turn log for a `memory push ok` line — the log must distinguish `push ok` /
   `push skip [nothing changed]` / `push failed`, because those three point at completely
   different bugs.
3. Confirm the commit landed in the store repo on GitHub.
4. Start a **new thread in the same channel** and confirm it recalls the fact.
5. Ask in a **different channel** and confirm it does not (unless it was written to the
   shared tier).

## Do not build

A memory skill for writing, a recall endpoint, embeddings or vector search, a database, or
memory stored in Slack canvases / pinned messages. All of them are more code for a worse
result than markdown files in a git repo that the harness already knows how to use — and the
git store is what makes a poisoned memory a diffable, revertable, attributable commit.

```

## Transcript

Okay, so now we're gonna go ahead and add a memory to our agent.

And we wanna think, how do we want this memory to work? Do we

want it to be scoped per project or scoped per

channel or like a mix of both? And what kind of memory solution

we want to have? Now I personally prefer having the memory scoped per channel

and then any project-adjustable learnings to be inside

of the GitHub repo instead. But of course you may have your own preference and

you may want to do that. Now let's kind of quickly understand how memory works

inside of Claude Code. So for example, if you go to .claude folder inside of

here, then you go to projects and then you click on one of your projects.

So for example, I have this project over here. If I scroll down to

the very bottom, I can see a memory folder over here. And then

there is a MEMORY.md with a bunch of markdown files

for like different things that it's remembering. So if I open up the MEMORY.md,

then this is essentially an index file. And then all of these are

referencing other things. So we have a feedback section over here. We have

a user profile, and then we have projects memory over here.

So I can click on any of these and then it will load that in.

There's some metadata, the original session, and a bunch more stuff as well.

Now this is called auto-memory inside of Claude Code, and there

should be a video about this as well. But essentially we want our Slack agent

to take advantage of this. And if you look at the docs, then you will

see that we have a folder called auto-memory directory.

So we can set a custom storage location for our auto-memory.

And then if we set that custom location to something on the sandbox that

is synced automatically to a durable location, because the

sandboxes are not durable for the long-term, then we can build up a

pretty decent memory layer using the auto-memory feature inside

of Claude Code. So then the question is like, okay, where are these memories gonna

be stored in between sandbox instances?. And in my case,

I will use GitHub as a durable layer. So I'll make a repo and I

will call it JoeStar-Agent-Memory,

joestar-agent-memory, and then press,

make it private, press create repository over here.

And then I'll copy and paste this link back into the session. And there will

also be a prompt down below that you can copy and use to help build

out this memory layer. So pasting that in, it will basically say, "Give this

agent long-term memory that survives beyond a single sandbox and a single Slack

thread. Read the repo first. Tell me your plan before writing any code." And

it basically explains a whole bunch of things over here and that it will sync

after every turn if any changes are made to memory. And there's a bunch more

stuff that you can read as well. If you have any specific memory requirements

for your organization, then you may want to consider those as well.

Okay, so then it came up with a plan over here. So I will basically

say, Okay, cool. Can you go ahead and implement it, deploy it, do an end-to-end

test to make sure that it works? All right, so now we can see it

implemented the feature and it verified it end-to-end against a real

bot. And it did 5 different checks over here, all of which seem

to work. So if I were to go over to channels and I can see

some of the testing it was doing, where it was telling the bot to basically

remember a phrase and then checking up if it still remembered that phrase

and a bunch more stuff as well. So this is great because of the end-to-end

testing environment that we set up earlier in the class. Because we can simply tell

it to add a memory feature like this and then test it works and make

edits until it's working reliably. And finally, if I go over

to repo that we made earlier, you can see it's been happening automatically over here.

So we have a shared folder that it made for shared memories with the

MEMORY.md, which is an index to all of the memory files.

And then we have a channel-specific memory over here.

So this is the internal channel ID that Slack uses.

And you can see the channel ID for any of your channels by right-clicking on

the channel, doing a copy link over here.

And then if you paste it somewhere, for example, if I paste it over here,

then you can see this ID inside of the link is the same as

ID over here.
