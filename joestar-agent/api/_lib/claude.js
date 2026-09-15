import { Sandbox } from 'e2b';

const TEMPLATE = process.env.E2B_TEMPLATE ?? 'joestar-claude';

/**
 * Run one prompt through Claude Code in a throwaway cloud sandbox and return
 * its answer as text.
 *
 * The sandbox is the point: Claude runs with --dangerously-skip-permissions,
 * which is only safe because the machine it runs on is empty, isolated, and
 * destroyed afterwards. Nothing of ours is reachable from inside it.
 */
export async function runClaude({ prompt, timeoutMs = 240_000 }) {
  const sandbox = await Sandbox.create(TEMPLATE, {
    envs: {
      // Billed through the Claude subscription that created this token, not
      // through an Anthropic API key. Note ANTHROPIC_API_KEY outranks this one,
      // so it must not be set in the sandbox — we deliberately pass neither it
      // nor anything else from our own environment.
      CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN,
      DISABLE_TELEMETRY: '1',
      DISABLE_ERROR_REPORTING: '1',
      // Claude waits up to ten minutes for background tasks before exiting.
      // Our whole budget is five, so cap the wait well under it.
      CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS: '5000',
    },
    timeoutMs,
  });

  try {
    // -p is non-interactive: no TTY, no trust dialog, no onboarding to hang on.
    // --dangerously-skip-permissions is safe only because this machine is empty
    // and about to be destroyed. NOT --bare: it makes auth "strictly
    // ANTHROPIC_API_KEY or apiKeyHelper (OAuth and keychain are never read)",
    // which would silently break the subscription token we authenticate with.
    const result = await sandbox.commands.run(
      `claude -p ${shellQuote(prompt)} --dangerously-skip-permissions --output-format json`,
      { timeoutMs },
    );
    return parseAnswer(result.stdout);
  } finally {
    // Always kill it: a sandbox left running is a sandbox still being billed.
    await sandbox.kill().catch(() => {});
  }
}

/** Single-quote for the shell, so a prompt full of quotes and backticks is inert. */
export function shellQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

/**
 * --output-format json prints a result envelope. Fall back to raw stdout if the
 * shape ever changes, so a format change degrades to "slightly ugly" rather
 * than "the bot says nothing".
 */
export function parseAnswer(stdout) {
  const text = String(stdout ?? '').trim();
  if (!text) return '';
  try {
    const parsed = JSON.parse(text);
    return parsed.result ?? parsed.text ?? text;
  } catch {
    return text;
  }
}
