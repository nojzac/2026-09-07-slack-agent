// Deliberately the .mjs build, not the bare 'e2b' specifier.
//
// e2b ships no "exports" map, so `import 'e2b'` follows "main" to the
// CommonJS build, which does require('chalk') — and chalk v5 is ESM-only.
// Node 22+ tolerates require() of ESM, so this passes locally and in tests,
// then dies on Vercel with ERR_REQUIRE_ESM at module load, taking every
// request with it. Vercel runs Node 24, so it is the bundler's loader that
// cannot do it, not the Node version: raising engines.node does not help.
// The .mjs build imports chalk properly and loads in both places.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sandbox } from 'e2b/dist/index.mjs';
import { HOOK_PATH, HOOK_SOURCE, HOOK_SETTINGS, gitSetupScript } from './git-guard.js';
import { MCP_CONFIG_PATH, buildMcpConfig } from './mcp.js';
import { sandboxFiles } from './sandbox-files.js';
import { getUploadURL } from './slack.js';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

// Vercel's task root is not this module's own directory, and it is not
// necessarily process.cwd() either — so try both places a `toolkit/` next to
// the deployed bundle could actually land.
function resolveToolkitDir() {
  const candidates = [path.resolve(MODULE_DIR, '../../toolkit'), path.join(process.cwd(), 'toolkit')];
  return candidates.find((p) => fs.existsSync(p));
}

const TEMPLATE = process.env.E2B_TEMPLATE ?? 'joestar-claude';

// --global git config and the Claude settings file are both written relative to
// HOME, so the setup command and the claude command must agree about it. If they
// ever disagree, the credential helper is configured somewhere claude never
// looks and git asks for a password instead.
const SANDBOX_HOME = '/home/user';

/** Where attachments land, and where anything to send back is collected from. */
export const INPUT_DIR = '/tmp/inputs';
export const OUTPUT_DIR = '/tmp/outputs';

// Slack is not a file server and this is a 300-second function. Caps keep a
// model that decides to write a hundred files from turning into a hundred
// uploads.
export const MAX_OUTPUT_FILES = 5;

// Ours, not Slack's or E2B's — nothing platform-side forces this number. Now
// that output files stream from the sandbox straight to Slack's upload URL
// instead of passing through this function's memory, the real ceiling is
// time, not RAM: the file has to finish moving while the sandbox is still
// alive, inside the 300-second function budget, alongside everything else
// runClaude does. 64 MiB is a guess at what a slow upload can clear in that
// window; raise it only alongside runClaude's timeout math.
export const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

// Carved out of the sandbox's own lifetime, not the function's 300s. Uploads
// now run inside the sandbox, after the claude command returns but before
// sandbox.kill() — so the claude command cannot be given the sandbox's full
// timeoutMs, or the sandbox is already at its deadline when collectOutputs
// starts and every file is dropped. Split as: claude gets (timeoutMs -
// UPLOAD_BUDGET_MS), collectOutputs gets a share of UPLOAD_BUDGET_MS per file
// (UPLOAD_BUDGET_MS / MAX_OUTPUT_FILES each), so the two budgets sum to
// exactly timeoutMs — the sandbox outlives the run by exactly as much as
// uploading is allotted, no more.
const UPLOAD_BUDGET_MS = 30_000;

// e2b's Template.setEnvs (e2b/template.mjs) only applies during the template
// build — it's gone by the time a sandbox actually runs a command. Playwright
// needs both variables again here, at runtime, or a browser launched as `user`
// falls back to ~/.cache/ms-playwright (nothing there — "Executable doesn't
// exist") and `require('playwright')` from a /tmp script can't resolve at all.
export const SANDBOX_RUNTIME_ENVS = {
  PLAYWRIGHT_BROWSERS_PATH: '/opt/ms-playwright',
  NODE_PATH: '/usr/local/lib/node_modules',
  // These are what let plain `psql` and `pg_ctl` work against the build-time
  // cluster with no flags, instead of every command needing -h/-U/-d/-D.
  PGDATA: '/home/user/pgdata',
  PGHOST: '/tmp',
  PGUSER: 'user',
  PGDATABASE: 'user',
};

/**
 * Run one prompt through Claude Code in a throwaway cloud sandbox.
 *
 * The sandbox is the point: Claude runs with --dangerously-skip-permissions,
 * which is only safe because the machine it runs on is empty, isolated, and
 * destroyed afterwards. Nothing of ours is reachable from inside it.
 *
 * `inputs` are files the user attached, written in before the run.
 * Returns the answer plus whatever the model left in OUTPUT_DIR.
 *
 * THE TIMEOUT IS NEAR A HARD CEILING. Four minutes was not enough for real
 * GitHub work: the first two dogfooding requests (2026-09-16) both died with
 * "connection to sandbox ended before the stream completed" while Claude was
 * still working. 285s is as close to the function's own 300s maxDuration as is
 * safe — the remaining 15s covers editing the placeholder, calling
 * completeUploadExternal and adding the terminal reaction, all of which happen
 * after runClaude returns.
 *
 * The 285s itself is not all given to the claude command: collectOutputs now
 * streams output files to Slack from *inside* this same sandbox, after the
 * command returns and before sandbox.kill() in the `finally` below runs. See
 * UPLOAD_BUDGET_MS for how that 285s is split between the two.
 *
 * That raises the ceiling; it does not remove it. Work needing more than five
 * minutes cannot be done inside a Vercel function at all, and moving it out is
 * an architectural decision rather than a constant to bump. See RESUME.md.
 */
export async function runClaude({
  prompt,
  inputs = [],
  githubToken = null,
  slackToken = null,
  timeoutMs = 285_000,
}) {
  // The sandbox itself gets the full timeoutMs — it has to stay alive long
  // enough for both the run and the uploads that follow it. The claude command
  // gets less, so it cannot itself run the sandbox out the clock.
  const runTimeoutMs = Math.max(timeoutMs - UPLOAD_BUDGET_MS, 0);

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
      ...SANDBOX_RUNTIME_ENVS,
    },
    timeoutMs,
  });

  try {
    // The output directory has to exist before the run, or "write your answer
    // to /tmp/outputs/x.md" is a path error the model has to recover from.
    await sandbox.files.makeDir(OUTPUT_DIR).catch(() => {});

    // Persona + skills, written fresh every run: the sandbox is destroyed
    // after each one, so nothing written here ever survives to a "next
    // time". Never a gate — a broken toolkit should degrade to "no persona
    // this run", not fail the whole request.
    try {
      const files = sandboxFiles({ toolkitDir: resolveToolkitDir() }).map(({ path: p, data }) => ({
        path: p,
        data: Buffer.isBuffer(data) ? new Blob([data]) : data,
      }));
      await sandbox.files.write(files);
    } catch (err) {
      console.warn('[sandbox-files] could not write persona/skills:', err.message);
    }

    for (const file of inputs) {
      await sandbox.files.write(file.path, new Blob([file.bytes]));
    }

    // Written fresh every run, never conditional on a key existing: deepwiki
    // needs no credential at all, and exa is simply left out of the object
    // when EXA_API_KEY is unset (see mcp.js for why that matters).
    const hasExaKey = Boolean(process.env.EXA_API_KEY);
    await sandbox.files.write(MCP_CONFIG_PATH, JSON.stringify(buildMcpConfig({ hasExaKey })));

    // Everything the sandbox needs to do GitHub work, set up only when there is
    // a token to do it with. Without one the sandbox has no git identity, no
    // credential helper and no hook — which is correct: it cannot reach GitHub
    // anyway, and a credential helper referencing an unset variable would turn a
    // clear "not configured" into a confusing auth prompt.
    if (githubToken) await configureGitHub(sandbox);

    // Codex second-opinion reviewer: configured once per run, before claude
    // spawns, so the CLI is ready if a later skill decides to shell out to it.
    await setUpCodex(sandbox);

    // The token is passed per command, never at Sandbox.create. Anything Claude
    // spawns inherits it — that is required for git and gh to work at all, and
    // it means any code the model runs can read it. It is not compartmentalised
    // and should not be described as if it were; the mitigation is that it
    // expires in an hour, not that it is hidden.
    // EXA_API_KEY rides along the same way GH_TOKEN does: passed to this one
    // command, never to Sandbox.create and never baked into the template.
    // Claude Code expands the "${EXA_API_KEY}" placeholder in mcp.json from
    // this process env only when it actually opens the exa connection.
    const envs = {
      ...(githubToken ? { GH_TOKEN: githubToken, HOME: SANDBOX_HOME, HISTFILE: '/dev/null' } : {}),
      ...(hasExaKey ? { EXA_API_KEY: process.env.EXA_API_KEY } : {}),
    };

    // -p is non-interactive: no TTY, no trust dialog, no onboarding to hang on.
    // --dangerously-skip-permissions is safe only because this machine is empty
    // and about to be destroyed. NOT --bare: it makes auth "strictly
    // ANTHROPIC_API_KEY or apiKeyHelper (OAuth and keychain are never read)",
    // which would silently break the subscription token we authenticate with.
    // --mcp-config plus --strict-mcp-config: the only MCP servers available are
    // the ones written above, not whatever a cloned repo's own .mcp.json asks for.
    const result = await sandbox.commands.run(
      `claude -p ${shellQuote(prompt)} --dangerously-skip-permissions --output-format json` +
        ` --mcp-config ${MCP_CONFIG_PATH} --strict-mcp-config`,
      { timeoutMs: runTimeoutMs, envs },
    );

    // Uploads happen here, inside the try, while the sandbox is still up —
    // collectOutputs streams bytes from inside the sandbox to Slack. Moving
    // this into the `finally` or into the caller would run it after
    // sandbox.kill() below, against a sandbox that no longer exists.
    return {
      answer: parseAnswer(result.stdout),
      files: await collectOutputs(sandbox, slackToken, UPLOAD_BUDGET_MS),
    };
  } finally {
    // Always kill it: a sandbox left running is a sandbox still being billed.
    await sandbox.kill().catch(() => {});
  }
}

/**
 * Give the sandbox a git identity, a credential helper, and one push guard.
 *
 * Never throws. Every piece of this is an enabler, not a gate: if the hook
 * cannot be written the run should still happen, because the hook was never the
 * thing keeping anyone safe — the App's permissions and the branch ruleset are.
 * Failing the whole request over a missing nudge would be the wrong trade.
 */
async function configureGitHub(sandbox) {
  try {
    await sandbox.files.write(HOOK_PATH, HOOK_SOURCE);
    await sandbox.files.write(
      `${SANDBOX_HOME}/.claude/settings.json`,
      JSON.stringify(HOOK_SETTINGS, null, 2),
    );
    const res = await sandbox.commands.run(gitSetupScript(), {
      envs: { HOME: SANDBOX_HOME },
    });
    if (res.exitCode !== 0) console.warn('[github] git setup exited', res.exitCode);
  } catch (err) {
    console.warn('[github] could not configure the sandbox for git:', err.message);
  }
}

// Exactly what config.toml needs to contain: reasoning effort turned up, and
// approvals/sandboxing both switched off because the sandbox itself — not
// Codex — is the isolation boundary here.
const CODEX_CONFIG_TOML = `model_reasoning_effort = "high"
approval_policy = "never"
sandbox_mode = "danger-full-access"
`;

/**
 * Give the sandbox a Codex CLI credential, for a second-opinion reviewer.
 *
 * The credential is a FILE, never an env var — it must never be passed via
 * `envs` (Sandbox.create or any command), and never interpolated into a
 * command string, or it would sit in sandbox process listings and shell
 * history for the run's lifetime.
 *
 * Never throws, same as configureGitHub: this is an enabler, not a gate, so a
 * broken or missing credential should degrade to "no Codex" rather than fail
 * the whole run.
 */
export async function setUpCodex(sandbox) {
  const authJson = process.env.CODEX_AUTH_JSON;
  if (!authJson) return;

  try {
    JSON.parse(authJson);
  } catch {
    // Never log err.message here: V8's SyntaxError message embeds a slice of
    // the input it failed to parse, so a malformed credential would put its
    // own first characters into Vercel logs. Log a fixed string instead.
    console.warn('[codex] CODEX_AUTH_JSON is not valid JSON');
    return;
  }

  try {
    await sandbox.files.write(`${SANDBOX_HOME}/.codex/auth.json`, authJson);
    await sandbox.files.write(`${SANDBOX_HOME}/.codex/config.toml`, CODEX_CONFIG_TOML);
    const res = await sandbox.commands.run(
      `chmod 700 ${SANDBOX_HOME}/.codex && chmod 600 ${SANDBOX_HOME}/.codex/auth.json`,
    );
    if (res.exitCode !== 0) console.warn('[codex] chmod exited', res.exitCode);
  } catch (err) {
    console.warn('[codex] could not configure the sandbox for codex:', err.message);
  }
}

/**
 * Everything the model left in OUTPUT_DIR, uploaded to Slack before the
 * sandbox dies — never read into this function's memory.
 *
 * For each file: ask Slack for a one-time upload_url bound to that filename
 * and byte length (files.getUploadURLExternal, via getUploadURL), then run
 * curl *inside the sandbox* to POST the file's own bytes at that URL. The
 * only things that cross into the sandbox are the URL and a shell command;
 * no Slack token goes in, and the URL is spent after this one POST. What
 * comes back out is just {name, file_id} — completeUploadExternal (from the
 * function, using file_id/channel_id/thread_ts) still happens after this
 * returns, same as it always has.
 *
 * Never throws: a missing directory is the normal case — most answers are
 * just text — and a file that cannot be uploaded should not lose the answer
 * with it.
 */
export async function collectOutputs(sandbox, slackToken, uploadBudgetMs = UPLOAD_BUDGET_MS) {
  let entries;
  try {
    entries = await sandbox.files.list(OUTPUT_DIR);
  } catch {
    return [];
  }

  // Split evenly across the files this call could possibly upload, so one
  // slow file cannot eat the whole budget and starve the rest.
  const perFileTimeoutMs = Math.max(Math.floor(uploadBudgetMs / MAX_OUTPUT_FILES), 1);

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
      const { upload_url, file_id } = await getUploadURL({
        token: slackToken,
        filename: entry.name,
        length: entry.size,
      });

      // curl, not fetch — the bytes live in the sandbox, so the POST has to
      // run there too. --data-binary sends the file exactly as-is, the same
      // raw body our own fetch(upload_url, { body: bytes }) sends elsewhere
      // in the codebase (see uploadFile in slack.js). That fetch call sends no
      // Content-Type at all for a raw byte body, and curl's -d/--data flags
      // default to application/x-www-form-urlencoded, so the header is
      // stripped outright with `-H 'Content-Type:'` rather than pinned to
      // some guessed value — this is the only way for the two paths to send
      // an identical request.
      const cmd =
        `curl -sS -X POST --data-binary @${shellQuote(entry.path)} ` +
        `-H 'Content-Type:' ` +
        `-o /dev/null -w '%{http_code}' ${shellQuote(upload_url)}`;
      const res = await sandbox.commands.run(cmd, { timeoutMs: perFileTimeoutMs });
      const status = Number(res.stdout?.trim());
      if (!(status >= 200 && status < 300)) {
        console.warn(`[claude] upload POST for ${entry.name} failed: HTTP ${res.stdout}`);
        continue;
      }

      files.push({ name: entry.name, file_id });
    } catch (err) {
      console.warn(`[claude] could not upload ${entry.name}:`, err.message);
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
