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
6. Commit and push the moment the code compiles/passes, then keep going if
   there's more to do. Pushing early means partial work survives even if the
   run runs out of time later.
7. Open the PR (or update the existing one) against the branch you were told.
8. Report back: what you did, and — if you ran out of time or scope — exactly
   what you did not do, so the next run can pick it up.

## Budget

You have about four minutes per run. Watch the clock from the start. If you
will not finish, push what compiles and passes and say what's left, rather
than losing everything to a timeout with nothing pushed.

## Rules

- Never force-push. It's disabled anyway, but don't attempt it.
- Never delete branches.
- If the change touches the sandbox template (the E2B/Docker image the agent
  runs in), say explicitly that the image must be rebuilt by a human — editing
  the template source does not change the running image.
