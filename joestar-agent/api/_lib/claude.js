// Deliberately the .mjs build, not the bare 'e2b' specifier.
//
// e2b ships no "exports" map, so `import 'e2b'` follows "main" to the
// CommonJS build, which does require('chalk') — and chalk v5 is ESM-only.
// Node 22+ tolerates require() of ESM, so this passes locally and in tests,
// then dies on Vercel with ERR_REQUIRE_ESM at module load, taking every
// request with it. Vercel runs Node 24, so it is the bundler's loader that
// cannot do it, not the Node version: raising engines.node does not help.
// The .mjs build imports chalk properly and loads in both places.
import { Sandbox } from 'e2b/dist/index.mjs';

const TEMPLATE = process.env.E2B_TEMPLATE ?? 'joestar-claude';

/** Where attachments land, and where anything to send back is collected from. */
export const INPUT_DIR = '/tmp/inputs';
export const OUTPUT_DIR = '/tmp/outputs';

// Slack is not a file server and this is a 300-second function. Caps keep a
// model that decides to write a hundred files from turning into a hundred
// uploads.
const MAX_OUTPUT_FILES = 5;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;

/**
 * Run one prompt through Claude Code in a throwaway cloud sandbox.
 *
 * The sandbox is the point: Claude runs with --dangerously-skip-permissions,
 * which is only safe because the machine it runs on is empty, isolated, and
 * destroyed afterwards. Nothing of ours is reachable from inside it.
 *
 * `inputs` are files the user attached, written in before the run.
 * Returns the answer plus whatever the model left in OUTPUT_DIR.
 */
export async function runClaude({ prompt, inputs = [], timeoutMs = 240_000 }) {
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
    // The output directory has to exist before the run, or "write your answer
    // to /tmp/outputs/x.md" is a path error the model has to recover from.
    await sandbox.files.makeDir(OUTPUT_DIR).catch(() => {});

    for (const file of inputs) {
      await sandbox.files.write(file.path, new Blob([file.bytes]));
    }

    // -p is non-interactive: no TTY, no trust dialog, no onboarding to hang on.
    // --dangerously-skip-permissions is safe only because this machine is empty
    // and about to be destroyed. NOT --bare: it makes auth "strictly
    // ANTHROPIC_API_KEY or apiKeyHelper (OAuth and keychain are never read)",
    // which would silently break the subscription token we authenticate with.
    const result = await sandbox.commands.run(
      `claude -p ${shellQuote(prompt)} --dangerously-skip-permissions --output-format json`,
      { timeoutMs },
    );

    return {
      answer: parseAnswer(result.stdout),
      files: await collectOutputs(sandbox),
    };
  } finally {
    // Always kill it: a sandbox left running is a sandbox still being billed.
    await sandbox.kill().catch(() => {});
  }
}

/**
 * Everything the model left in OUTPUT_DIR, read out before the sandbox dies.
 *
 * Never throws: a missing directory is the normal case — most answers are just
 * text — and a file that cannot be read should not lose the answer with it.
 */
async function collectOutputs(sandbox) {
  let entries;
  try {
    entries = await sandbox.files.list(OUTPUT_DIR);
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries ?? []) {
    if (files.length >= MAX_OUTPUT_FILES) {
      console.warn(`[claude] more than ${MAX_OUTPUT_FILES} output files; ignoring the rest`);
      break;
    }
    if (entry.type === 'dir') continue;
    if (entry.size > MAX_OUTPUT_BYTES) {
      console.warn(`[claude] skipping ${entry.name}: ${entry.size} bytes is over the cap`);
      continue;
    }
    try {
      const bytes = await sandbox.files.read(entry.path, { format: 'bytes' });
      if (bytes?.length) files.push({ name: entry.name, bytes });
    } catch (err) {
      console.warn(`[claude] could not read ${entry.name}:`, err.message);
    }
  }
  return files;
}

/**
 * Where one attachment lands inside the sandbox.
 *
 * The name comes from whoever uploaded the file, so it is treated as hostile:
 * anything that is not a plain filename character is replaced, which flattens
 * "../../etc/passwd" into something harmless. The index keeps two files called
 * screenshot.png from becoming one.
 */
export function sandboxInputPath(name, index) {
  const safe = String(name ?? '')
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 80);
  return `${INPUT_DIR}/${index}-${safe || 'file'}`;
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
