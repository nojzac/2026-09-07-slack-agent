/**
 * One narrow guard inside the sandbox: no destructive pushes.
 *
 * BE CLEAR ABOUT WHAT THIS IS. It is a nudge that stops an agent making a bad
 * decision. It is not a control and it does not stop an attacker: an alias, a
 * shell function, `G=push; git $G --force`, or calling git-receive-pack directly
 * all walk straight past a string match. Anyone who can @mention the bot can run
 * arbitrary code in here.
 *
 * WHY THIS ONE AND NOTHING ELSE. The branch ruleset protects the default branch
 * only, so `contents: write` still permits force-pushing over or deleting any
 * other branch — someone else's work in progress included. That is the one
 * destructive capability GitHub allows and nobody wants. Everything else is
 * either already refused by GitHub (protected main, .github/workflows/) or
 * unenforceable by string-matching (exfiltration via curl, python, nc, or an
 * attacker-controlled remote — `X=$GH_TOKEN` defeats any pattern you write).
 *
 * Deliberately NOT a general dangerous-command denylist. The sandbox is a
 * throwaway container killed after every run, so `rm -rf` in it costs nothing,
 * and a denylist that catches the obvious cases while missing the rest is worse
 * than none because it reads as protection.
 */

/** Where the hook lands inside the sandbox. */
export const HOOK_PATH = '/tmp/.joestar/block-destructive-push.mjs';

/**
 * The hook, as a string rather than a file on disk here.
 *
 * Vercel's bundler includes what it can see imported; a file read at runtime can
 * simply not be in the deployment. A string cannot be left behind.
 *
 * Claude Code passes the tool input as JSON on stdin — not as template
 * arguments. Exit 2 blocks the call and feeds stderr back to the model so it can
 * read why and choose differently; exit 1 does not block. The docs also describe
 * an exit-0-plus-JSON form, which is ignored on exit 2 — so this uses exactly
 * one mechanism.
 */
export const HOOK_SOURCE = String.raw`#!/usr/bin/env node
let raw = '';
process.stdin.on('data', d => (raw += d));
process.stdin.on('end', () => {
  let cmd = '';
  try {
    cmd = JSON.parse(raw || '{}')?.tool_input?.command ?? '';
  } catch {
    process.exit(0); // unparseable input is not a reason to block work
  }

  // Only git push. -f and -d mean harmless things to other subcommands.
  if (!/\bgit\b[^\n;|&]*\bpush\b/.test(cmd)) process.exit(0);

  const destructive = [
    /--force\b/, /--force-with-lease\b/, /--force-if-includes\b/,
    /(^|\s)-f(\s|$)/,
    /--delete\b/, /(^|\s)-d(\s|$)/,
    /--mirror\b/, /--prune\b/,
    /\s\+[^\s:]+:/,        // +src:dst — a forced refspec
    /\s:[A-Za-z0-9._\/-]+/, // :branch — colon-delete
  ];

  if (destructive.some(re => re.test(cmd))) {
    process.stderr.write(
      'Force-push and branch deletion are disabled. Push a new branch and open a PR instead.\n',
    );
    process.exit(2);
  }
  process.exit(0);
});
`;

/**
 * Claude Code settings carrying only the hook.
 *
 * ONLY the hooks key. This repo has already been burned by a baked-in
 * apiKeyHelper in this same file overriding CLAUDE_CODE_OAUTH_TOKEN — writing a
 * whole settings object here would risk repeating it.
 */
export const HOOK_SETTINGS = {
  hooks: {
    PreToolUse: [
      {
        matcher: 'Bash',
        hooks: [{ type: 'command', command: `node ${HOOK_PATH}` }],
      },
    ],
  },
};

/**
 * Shell to configure git inside the sandbox.
 *
 * Three things, each with a failure mode worth knowing:
 *
 * 1. A CREDENTIAL HELPER, because git does not read GH_TOKEN — only the gh CLI
 *    does. What lands on disk is the literal string $GH_TOKEN, expanded only
 *    when git runs the helper, so the token itself is never written anywhere.
 *    Deliberately NOT the token in the remote URL: that persists in .git/config
 *    in plaintext for anything later in the run to read. And never on a command
 *    line, where it is visible in ps.
 *
 * 2. AN IDENTITY, because `git commit` fails outright without user.name and
 *    user.email. The values do not matter; the absence does, and it looks like a
 *    permissions problem when it is not.
 *
 * 3. HOME, explicitly. --global writes relative to HOME, so if this command and
 *    the claude command disagree about it, the config written here is invisible
 *    there.
 */
export function gitSetupScript({ name = 'joestar', email = 'joestar@users.noreply.github.com' } = {}) {
  const helper = `!f() { echo username=x-access-token; echo "password=$GH_TOKEN"; }; f`;
  return [
    `git config --global credential.https://github.com.helper '${helper}'`,
    `git config --global user.name '${name}'`,
    `git config --global user.email '${email}'`,
    // Nothing the model types should land in shell history.
    `git config --global core.pager cat`,
  ].join(' && ');
}
