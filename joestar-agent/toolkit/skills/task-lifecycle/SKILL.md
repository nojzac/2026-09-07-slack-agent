---
name: task-lifecycle
description: How to run a task end to end in this sandbox: clone, branch, change, test, push, open a PR, report
---

# Task lifecycle

The sandbox is destroyed at the end of every run, so nothing here persists
except what you push or upload. Work in this order:

1. Shallow clone (`--depth 1`, sparse-checkout the subtree you need if the repo
   is large). Never do a full clone.
2. Branch off the base you were told to use. Never work on main directly.
3. Read only the files you were told to read. Do not survey the repo.
4. Make the change.
5. Test it — run the relevant tests, not the whole suite more than once.
6. Push a first `wip:` commit as soon as the branch exists and the first file
   has changed — before anything passes, before the change is complete. Then
   commit and push again after every step that compiles. A run that times out
   with nothing pushed loses all of its work; a run that times out after a wip
   push loses only the last step.
7. Open the PR (or update the existing one) against the branch you were told.
8. Report back: what you did, and — if you ran out of time or scope — exactly
   what you did not do, so the next run can pick it up.

## Budget

You have about four minutes per run. Watch the clock from the start. If you
will not finish, push what you have (a wip commit is fine) and say what's left,
rather than losing everything to a timeout with nothing pushed.

## Progress goes in commit messages

You cannot post to Slack while the run is in progress; if the run times out,
the only thing anyone sees is your branch. So every commit message's first
line records where you are: `wip: step 3 of 5 — tests written, events.js
wiring next`. Use the step numbers from the request you were given. Someone
reading `git log` on your branch must be able to tell what was finished and
what the next run should start on.

## Rules

- Never force-push. It's disabled anyway, but don't attempt it.
- Never delete branches.
- If the change touches the sandbox template (the E2B/Docker image the agent
  runs in), say explicitly that the image must be rebuilt by a human — editing
  the template source does not change the running image.
