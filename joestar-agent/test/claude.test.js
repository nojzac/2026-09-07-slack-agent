import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';

process.env.SLACK_SIGNING_SECRET = 'test-secret';
process.env.SLACK_BOT_TOKEN = 'xoxb-test';
process.env.E2B_API_KEY = 'e2b-test';
process.env.CLAUDE_CODE_OAUTH_TOKEN = 'oauth-test';

const CLAUDE_JS_PATH = fileURLToPath(new URL('../api/_lib/claude.js', import.meta.url));
const { SANDBOX_RUNTIME_ENVS, collectOutputs, setUpCodex, runClaude, mergeSettings } = await import('../api/_lib/claude.js');
const { sandboxFiles } = await import('../api/_lib/sandbox-files.js');
const { Sandbox } = await import('e2b/dist/index.mjs');

/** A fresh toolkit dir with one skill (SKILL.md + a nested file) and one skill missing SKILL.md. */
function makeToolkitDir() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'toolkit-'));
  const goodSkill = path.join(dir, 'skills', 'good-skill');
  mkdirSync(path.join(goodSkill, 'scripts'), { recursive: true });
  writeFileSync(path.join(goodSkill, 'SKILL.md'), '# good skill\n');
  writeFileSync(path.join(goodSkill, 'scripts', 'run.sh'), '#!/bin/sh\necho hi\n');
  writeFileSync(path.join(goodSkill, '.hidden'), 'should be skipped');

  const badSkill = path.join(dir, 'skills', 'no-skill-md');
  mkdirSync(badSkill, { recursive: true });
  writeFileSync(path.join(badSkill, 'notes.txt'), 'no SKILL.md here');

  return dir;
}

/** Stub Slack's files.getUploadURLExternal, the only network call collectOutputs makes directly. */
function mockUploadFetch() {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(
      JSON.stringify({ ok: true, upload_url: 'https://files.slack.com/upload/xyz', file_id: 'F1' }),
      { status: 200 },
    );
  };
  return calls;
}

// ---------------------------------------------------------------------------
// collectOutputs — the sandbox-to-Slack streaming path
// ---------------------------------------------------------------------------

test('collectOutputs asks Slack for an upload URL per file, sized off entry.size, and never reads bytes', async () => {
  const calls = mockUploadFetch();
  const runCmds = [];
  const sandbox = {
    files: {
      list: async () => [{ name: 'out.txt', path: '/tmp/outputs/out.txt', size: 42, type: 'file' }],
      read: async () => { throw new Error('files.read must never be called on the output path'); },
    },
    commands: {
      run: async (cmd, opts) => { runCmds.push({ cmd, opts }); return { stdout: '200' }; },
    },
  };

  const files = await collectOutputs(sandbox, 'xoxb-test');

  const urlCall = calls.find(c => c.url.includes('getUploadURLExternal'));
  assert.ok(urlCall, 'should request an upload URL');
  const body = Object.fromEntries(new URLSearchParams(urlCall.init.body));
  assert.equal(body.filename, 'out.txt');
  assert.equal(body.length, '42');

  assert.equal(runCmds.length, 1, 'should shell out once to move the bytes');
  assert.deepEqual(files, [{ name: 'out.txt', file_id: 'F1' }]);
});

test('the Slack token never crosses into the sandbox', async () => {
  mockUploadFetch();
  const token = 'xoxb-super-secret-token';
  const runCalls = [];
  const sandbox = {
    files: { list: async () => [{ name: 'a.txt', path: '/tmp/outputs/a.txt', size: 10, type: 'file' }] },
    commands: { run: async (cmd, opts) => { runCalls.push({ cmd, opts }); return { stdout: '200' }; } },
  };

  await collectOutputs(sandbox, token);

  assert.ok(runCalls.length, 'the test should actually exercise a command');
  for (const { cmd, opts } of runCalls) {
    assert.doesNotMatch(cmd, new RegExp(token), 'token must not appear in the shell command string');
    assert.doesNotMatch(
      JSON.stringify(opts?.envs ?? {}),
      new RegExp(token),
      'token must not appear in the envs object',
    );
  }
});

test('a non-2xx from the sandbox curl skips that file and does not throw', async () => {
  mockUploadFetch();
  const sandbox = {
    files: {
      list: async () => [
        { name: 'bad.txt', path: '/tmp/outputs/bad.txt', size: 5, type: 'file' },
        { name: 'good.txt', path: '/tmp/outputs/good.txt', size: 5, type: 'file' },
      ],
    },
    commands: {
      run: async (cmd) => ({ stdout: cmd.includes('bad.txt') ? '500' : '200' }),
    },
  };

  const files = await collectOutputs(sandbox, 'xoxb-test');
  assert.deepEqual(files.map(f => f.name), ['good.txt']);
});

test('each upload gets a bounded share of the upload budget, not an unlimited default', async () => {
  mockUploadFetch();
  const runCalls = [];
  const sandbox = {
    files: { list: async () => [{ name: 'a.txt', path: '/tmp/outputs/a.txt', size: 5, type: 'file' }] },
    commands: { run: async (cmd, opts) => { runCalls.push(opts); return { stdout: '200' }; } },
  };

  await collectOutputs(sandbox, 'xoxb-test', 30_000);

  assert.ok(Number.isFinite(runCalls[0]?.timeoutMs), 'the curl call must carry an explicit timeoutMs');
  assert.ok(runCalls[0].timeoutMs < 30_000, 'one file must not be allotted the whole budget');
});

// ---------------------------------------------------------------------------
// setUpCodex — the Codex CLI credential, written as a file, never an env var
// ---------------------------------------------------------------------------

test('CODEX_AUTH_JSON never enters the sandbox as an env var or command-string substring', async () => {
  const secret = JSON.stringify({ token: 'sk-codex-super-secret-value' });
  const prevEnv = process.env.CODEX_AUTH_JSON;
  process.env.CODEX_AUTH_JSON = secret;
  try {
    const runCalls = [];
    const sandbox = {
      files: { write: async () => {} },
      commands: { run: async (cmd, opts) => { runCalls.push({ cmd, opts }); return { exitCode: 0 }; } },
    };

    await setUpCodex(sandbox);

    assert.ok(runCalls.length, 'the test should actually exercise a command');
    for (const { cmd, opts } of runCalls) {
      assert.doesNotMatch(cmd, /sk-codex-super-secret-value/, 'auth JSON must not appear in the shell command string');
      assert.doesNotMatch(
        JSON.stringify(opts?.envs ?? {}),
        /sk-codex-super-secret-value/,
        'auth JSON must not appear in the envs object',
      );
    }
    assert.doesNotMatch(
      JSON.stringify(SANDBOX_RUNTIME_ENVS),
      /sk-codex-super-secret-value/,
      'auth JSON must not leak into SANDBOX_RUNTIME_ENVS, which is spread into every Sandbox.create env',
    );
  } finally {
    if (prevEnv === undefined) delete process.env.CODEX_AUTH_JSON;
    else process.env.CODEX_AUTH_JSON = prevEnv;
  }
});

test('setUpCodex writes auth.json and config.toml when set, and writes nothing when unset', async () => {
  const prevEnv = process.env.CODEX_AUTH_JSON;
  try {
    const secret = JSON.stringify({ token: 'sk-codex-test' });
    process.env.CODEX_AUTH_JSON = secret;
    const writes = [];
    const sandboxSet = {
      files: { write: async (path, data) => { writes.push({ path, data }); } },
      commands: { run: async () => ({ exitCode: 0 }) },
    };

    await setUpCodex(sandboxSet);

    assert.deepEqual(
      writes.map(w => w.path).sort(),
      ['/home/user/.codex/auth.json', '/home/user/.codex/config.toml'].sort(),
    );
    assert.equal(writes.find(w => w.path === '/home/user/.codex/auth.json').data, secret);
    assert.equal(
      writes.find(w => w.path === '/home/user/.codex/config.toml').data,
      'model_reasoning_effort = "high"\napproval_policy = "never"\nsandbox_mode = "danger-full-access"\n',
    );

    delete process.env.CODEX_AUTH_JSON;
    const writesUnset = [];
    const sandboxUnset = {
      files: { write: async (path, data) => { writesUnset.push({ path, data }); } },
      commands: { run: async () => { throw new Error('setUpCodex must not run a command when unset'); } },
    };

    await setUpCodex(sandboxUnset);

    assert.equal(writesUnset.length, 0, 'nothing should be written when CODEX_AUTH_JSON is unset');
  } finally {
    if (prevEnv === undefined) delete process.env.CODEX_AUTH_JSON;
    else process.env.CODEX_AUTH_JSON = prevEnv;
  }
});

test('setUpCodex never throws, even on bad JSON with a failing sandbox', async () => {
  const prevEnv = process.env.CODEX_AUTH_JSON;
  process.env.CODEX_AUTH_JSON = 'not json';
  try {
    const sandbox = {
      files: { write: async () => { throw new Error('sandbox is unreachable'); } },
      commands: { run: async () => { throw new Error('sandbox is unreachable'); } },
    };

    await assert.doesNotReject(setUpCodex(sandbox));
  } finally {
    if (prevEnv === undefined) delete process.env.CODEX_AUTH_JSON;
    else process.env.CODEX_AUTH_JSON = prevEnv;
  }
});

// e2b's Template.setEnvs (e2b/template.mjs) only applies during the template
// build, not when a sandbox actually runs — so these have to be set again
// here, at Sandbox.create time. This bug is invisible until something in the
// sandbox actually launches a browser, which nothing else in this suite does.
test('the sandbox gets Playwright env vars at runtime, not just at build time', () => {
  assert.equal(SANDBOX_RUNTIME_ENVS.PLAYWRIGHT_BROWSERS_PATH, '/opt/ms-playwright');
  assert.equal(SANDBOX_RUNTIME_ENVS.NODE_PATH, '/usr/local/lib/node_modules');
});

test('SANDBOX_RUNTIME_ENVS is actually spread into Sandbox.create, not just defined', () => {
  const source = readFileSync(CLAUDE_JS_PATH, 'utf8');
  const createCall = source.slice(source.indexOf('Sandbox.create('), source.indexOf('timeoutMs,\n  });'));
  assert.match(createCall, /\.\.\.SANDBOX_RUNTIME_ENVS/);
});

// ---------------------------------------------------------------------------
// ELEVENLABS_API_KEY — per-command envs on the claude command only, same as
// EXA_API_KEY: never at Sandbox.create, never in SANDBOX_RUNTIME_ENVS.
// ---------------------------------------------------------------------------

function makeRunClaudeSandbox(commandCalls) {
  return {
    files: { makeDir: async () => {}, write: async () => {}, list: async () => [] },
    commands: {
      run: async (cmd, opts) => {
        commandCalls.push({ cmd, opts });
        return { stdout: JSON.stringify({ result: 'ok' }), exitCode: 0 };
      },
    },
    kill: async () => {},
  };
}

test('ELEVENLABS_API_KEY set: present in the claude command envs and nowhere else', async () => {
  const prevEnv = process.env.ELEVENLABS_API_KEY;
  process.env.ELEVENLABS_API_KEY = 'el-secret-key';
  try {
    const commandCalls = [];
    const sandbox = makeRunClaudeSandbox(commandCalls);
    let createEnvs;
    const origCreate = Sandbox.create;
    Sandbox.create = async (_template, opts) => { createEnvs = opts?.envs; return sandbox; };
    try {
      await runClaude({ prompt: 'hi' });
    } finally {
      Sandbox.create = origCreate;
    }

    assert.ok(
      !('ELEVENLABS_API_KEY' in (createEnvs ?? {})),
      'must not be passed to Sandbox.create',
    );
    assert.ok(
      !('ELEVENLABS_API_KEY' in SANDBOX_RUNTIME_ENVS),
      'must not be baked into SANDBOX_RUNTIME_ENVS',
    );

    const claudeCmd = commandCalls.find((c) => c.cmd.startsWith('claude -p'));
    assert.ok(claudeCmd, 'the claude command should have run');
    assert.equal(claudeCmd.opts?.envs?.ELEVENLABS_API_KEY, 'el-secret-key');
    assert.doesNotMatch(
      claudeCmd.cmd,
      /el-secret-key/,
      'must not be interpolated into the command string',
    );

    for (const { opts } of commandCalls) {
      if (opts === claudeCmd.opts) continue;
      assert.ok(
        !('ELEVENLABS_API_KEY' in (opts?.envs ?? {})),
        'must not appear in any other command\'s envs',
      );
    }
  } finally {
    if (prevEnv === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = prevEnv;
  }
});

test('ELEVENLABS_API_KEY unset: absent from the claude command envs', async () => {
  const prevEnv = process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  try {
    const commandCalls = [];
    const sandbox = makeRunClaudeSandbox(commandCalls);
    const origCreate = Sandbox.create;
    Sandbox.create = async () => sandbox;
    try {
      await runClaude({ prompt: 'hi' });
    } finally {
      Sandbox.create = origCreate;
    }

    const claudeCmd = commandCalls.find((c) => c.cmd.startsWith('claude -p'));
    assert.ok(claudeCmd, 'the claude command should have run');
    assert.ok(!('ELEVENLABS_API_KEY' in (claudeCmd.opts?.envs ?? {})));
  } finally {
    if (prevEnv === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = prevEnv;
  }
});

// ---------------------------------------------------------------------------
// memory — setUpMemory/pushMemory/mergeSettings/memoryBriefing, the run-time
// half of Claude Code's own auto-memory (lesson 15, part 2).
// ---------------------------------------------------------------------------

const MEMORY_DIR = '/home/user/memory'; // must match MEMORY_DIR in claude.js
const MEMORY_BUDGET_MS = 25_000; // must match MEMORY_BUDGET_MS in claude.js

/** A runClaude-ready sandbox that also serves a fake memory repo and one output file. */
function makeMemorySandbox({ cloneExitCode = 0, outputs = [] } = {}) {
  const commandCalls = [];
  const writeCalls = [];
  const sandbox = {
    files: {
      makeDir: async () => {},
      write: async (p, data) => { writeCalls.push({ path: p, data }); },
      list: async () => outputs,
    },
    commands: {
      run: async (cmd, opts) => {
        commandCalls.push({ cmd, opts });
        if (cmd.includes('git clone --depth 1') && cmd.includes(MEMORY_DIR)) {
          return { exitCode: cloneExitCode, stdout: '', stderr: cloneExitCode ? 'clone failed' : '' };
        }
        if (cmd.startsWith('claude -p')) {
          return { stdout: JSON.stringify({ result: 'ok' }), exitCode: 0 };
        }
        if (cmd.startsWith('curl ')) {
          return { stdout: '200', exitCode: 0 };
        }
        return { stdout: '', exitCode: 0 };
      },
    },
    kill: async () => {},
  };
  return { sandbox, commandCalls, writeCalls };
}

test('memory off when memoryRepo is unset: no clone command, no settings patch, no briefing in the prompt', async () => {
  mockUploadFetch();
  const { sandbox, commandCalls, writeCalls } = makeMemorySandbox();
  const origCreate = Sandbox.create;
  Sandbox.create = async () => sandbox;
  try {
    await runClaude({ prompt: 'hi', githubToken: 'gh-token', channelId: 'C123' });
  } finally {
    Sandbox.create = origCreate;
  }

  assert.ok(
    !commandCalls.some((c) => c.cmd.includes('git clone') && c.cmd.includes(MEMORY_DIR)),
    'no memory clone command should run',
  );
  const settingsWrites = writeCalls.filter((w) => w.path === '/home/user/.claude/settings.json');
  for (const w of settingsWrites) {
    assert.ok(!JSON.parse(w.data).autoMemoryEnabled, 'settings.json must not be patched for memory when off');
  }
  const claudeCmd = commandCalls.find((c) => c.cmd.startsWith('claude -p'));
  assert.ok(claudeCmd, 'the claude command should have run');
  assert.doesNotMatch(claudeCmd.cmd, /long-term memory/, 'no memory briefing should be appended to the prompt');
});

test('memory on: the clone command precedes claude, and the push follows claude and precedes the first upload', async () => {
  mockUploadFetch();
  const { sandbox, commandCalls } = makeMemorySandbox({
    outputs: [{ name: 'out.txt', path: '/tmp/outputs/out.txt', size: 5, type: 'file' }],
  });
  const origCreate = Sandbox.create;
  Sandbox.create = async () => sandbox;
  try {
    await runClaude({ prompt: 'hi', githubToken: 'gh-token', memoryRepo: 'nojzac/memory', channelId: 'C123' });
  } finally {
    Sandbox.create = origCreate;
  }

  const cloneIdx = commandCalls.findIndex((c) => c.cmd.includes('git clone') && c.cmd.includes(MEMORY_DIR));
  const claudeIdx = commandCalls.findIndex((c) => c.cmd.startsWith('claude -p'));
  const pushIdx = commandCalls.findIndex((c) => c.cmd.includes('git push -q origin HEAD:main'));
  const uploadIdx = commandCalls.findIndex((c) => c.cmd.startsWith('curl '));

  assert.ok(cloneIdx > -1 && claudeIdx > -1 && pushIdx > -1 && uploadIdx > -1, 'all four commands should have run');
  assert.ok(cloneIdx < claudeIdx, 'clone must precede claude');
  assert.ok(claudeIdx < pushIdx, 'push must follow claude');
  assert.ok(pushIdx < uploadIdx, 'push must precede the first upload');
});

test('the GH_TOKEN value appears in no command string and no URL during a memory-on run', async () => {
  const calls = mockUploadFetch();
  const token = 'ghs-super-secret-memory-token';
  const { sandbox, commandCalls } = makeMemorySandbox({
    outputs: [{ name: 'out.txt', path: '/tmp/outputs/out.txt', size: 5, type: 'file' }],
  });
  const origCreate = Sandbox.create;
  Sandbox.create = async () => sandbox;
  try {
    await runClaude({ prompt: 'hi', githubToken: token, memoryRepo: 'nojzac/memory', channelId: 'C123' });
  } finally {
    Sandbox.create = origCreate;
  }

  for (const { cmd } of commandCalls) {
    assert.doesNotMatch(cmd, new RegExp(token), 'token must not appear in any command string');
  }
  for (const { url } of calls) {
    assert.doesNotMatch(url, new RegExp(token), 'token must not appear in any URL');
  }
});

test('mergeSettings keeps existing keys the patch does not mention', () => {
  const existing = { hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [] }] }, other: 1 };
  const patch = { autoMemoryEnabled: true, autoMemoryDirectory: '/home/user/memory/channels/C1' };

  const merged = mergeSettings(existing, patch);

  assert.deepEqual(merged, { ...existing, ...patch });
  assert.deepEqual(merged.hooks, existing.hooks, 'unrelated existing keys must survive the merge');
});

test("claude's timeout is reduced by MEMORY_BUDGET_MS only when memory is on", async () => {
  mockUploadFetch();
  const timeoutMs = 100_000;

  const off = makeMemorySandbox();
  const origCreate = Sandbox.create;
  Sandbox.create = async () => off.sandbox;
  try {
    await runClaude({ prompt: 'hi', githubToken: 'gh-token', channelId: 'C123', timeoutMs });
  } finally {
    Sandbox.create = origCreate;
  }
  const offClaudeCmd = off.commandCalls.find((c) => c.cmd.startsWith('claude -p'));

  const on = makeMemorySandbox();
  Sandbox.create = async () => on.sandbox;
  try {
    await runClaude({ prompt: 'hi', githubToken: 'gh-token', memoryRepo: 'nojzac/memory', channelId: 'C123', timeoutMs });
  } finally {
    Sandbox.create = origCreate;
  }
  const onClaudeCmd = on.commandCalls.find((c) => c.cmd.startsWith('claude -p'));

  assert.equal(offClaudeCmd.opts.timeoutMs - onClaudeCmd.opts.timeoutMs, MEMORY_BUDGET_MS);
});

test('a claude command rejection still pushes memory, and the original rejection propagates', async () => {
  mockUploadFetch();
  const commandCalls = [];
  const sandbox = {
    files: { makeDir: async () => {}, write: async () => {}, list: async () => [] },
    commands: {
      run: async (cmd, opts) => {
        commandCalls.push({ cmd, opts });
        if (cmd.includes('git clone --depth 1') && cmd.includes(MEMORY_DIR)) {
          return { exitCode: 0, stdout: '', stderr: '' };
        }
        if (cmd.startsWith('claude -p')) {
          throw new Error('claude command boom');
        }
        return { stdout: '', exitCode: 0 };
      },
    },
    kill: async () => {},
  };
  const origCreate = Sandbox.create;
  Sandbox.create = async () => sandbox;
  try {
    await assert.rejects(
      runClaude({ prompt: 'hi', githubToken: 'gh-token', memoryRepo: 'nojzac/memory', channelId: 'C123' }),
      /claude command boom/,
    );
  } finally {
    Sandbox.create = origCreate;
  }

  assert.ok(
    commandCalls.some((c) => c.cmd.includes('git push -q origin HEAD:main')),
    'the memory push should still run after the claude command rejects',
  );
});

test('a failing memory setup leaves the run alive and memory off', async () => {
  mockUploadFetch();
  const { sandbox, commandCalls } = makeMemorySandbox({ cloneExitCode: 1 });
  const origCreate = Sandbox.create;
  Sandbox.create = async () => sandbox;
  try {
    const result = await runClaude({ prompt: 'hi', githubToken: 'gh-token', memoryRepo: 'nojzac/memory', channelId: 'C123' });
    assert.equal(result.answer, 'ok', 'the run should still produce an answer');
  } finally {
    Sandbox.create = origCreate;
  }

  const claudeCmd = commandCalls.find((c) => c.cmd.startsWith('claude -p'));
  assert.doesNotMatch(claudeCmd.cmd, /long-term memory/, 'no briefing should be appended when setup failed');
  assert.ok(
    !commandCalls.some((c) => c.cmd.includes('git push -q origin HEAD:main')),
    'no memory push should run when setup failed',
  );
});

// ---------------------------------------------------------------------------
// sandboxFiles — the persona + skills payload written fresh into every sandbox
// ---------------------------------------------------------------------------

test('sandboxFiles always includes CLAUDE.md at the right path', () => {
  const files = sandboxFiles({});
  const claudeMd = files.find((f) => f.path === '/home/user/.claude/CLAUDE.md');
  assert.ok(claudeMd, 'CLAUDE.md entry should be present');
  assert.match(claudeMd.data, /^You are Joestar/);
});

test('missing toolkitDir returns only CLAUDE.md', () => {
  const files = sandboxFiles({ toolkitDir: '/does/not/exist' });
  assert.deepEqual(files.map((f) => f.path), ['/home/user/.claude/CLAUDE.md']);
});

test('a skill\'s files map to /home/user/.claude/skills/<name>/<relative path>, dotfiles skipped', () => {
  const dir = makeToolkitDir();
  try {
    const files = sandboxFiles({ toolkitDir: dir });
    const paths = files.map((f) => f.path);
    assert.ok(paths.includes('/home/user/.claude/skills/good-skill/SKILL.md'));
    assert.ok(paths.includes('/home/user/.claude/skills/good-skill/scripts/run.sh'));
    assert.ok(!paths.some((p) => p.includes('.hidden')), 'dotfiles must be skipped');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a skill directory without SKILL.md is skipped', () => {
  const dir = makeToolkitDir();
  try {
    const files = sandboxFiles({ toolkitDir: dir });
    const paths = files.map((f) => f.path);
    assert.ok(!paths.some((p) => p.includes('no-skill-md')), 'skill without SKILL.md must be skipped');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('over-cap payload returns CLAUDE.md only', () => {
  const dir = makeToolkitDir();
  try {
    const bigSkill = path.join(dir, 'skills', 'big-skill');
    mkdirSync(bigSkill, { recursive: true });
    writeFileSync(path.join(bigSkill, 'SKILL.md'), '# big\n');
    writeFileSync(path.join(bigSkill, 'blob.bin'), Buffer.alloc(3 * 1024 * 1024, 1));

    const files = sandboxFiles({ toolkitDir: dir });
    assert.deepEqual(files.map((f) => f.path), ['/home/user/.claude/CLAUDE.md']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the sandboxFiles write happens before the claude command runs', () => {
  const source = readFileSync(CLAUDE_JS_PATH, 'utf8');
  const writeIdx = source.indexOf('sandboxFiles({ toolkitDir: resolveToolkitDir() })');
  const claudeCmdIdx = source.indexOf('sandbox.commands.run(\n      `claude -p');
  assert.ok(writeIdx > -1, 'sandboxFiles call should exist');
  assert.ok(claudeCmdIdx > -1, 'claude command should exist');
  assert.ok(writeIdx < claudeCmdIdx, 'sandboxFiles write must precede the claude command');
});

test('a rejected sandbox.files.write for persona/skills never throws and the run still reaches the claude command', async () => {
  const calls = [];
  const sandbox = {
    files: {
      makeDir: async () => {},
      write: async (...args) => {
        // Only the persona/skills call passes a single array argument; every
        // other sandbox.files.write call in runClaude (MCP config, inputs)
        // passes (path, data) and must keep succeeding.
        if (args.length === 1 && Array.isArray(args[0])) throw new Error('write boom');
      },
      list: async () => [],
    },
    commands: {
      run: async (cmd) => {
        calls.push(cmd);
        return { stdout: JSON.stringify({ result: 'ok' }), exitCode: 0 };
      },
    },
    kill: async () => {},
  };

  const origCreate = Sandbox.create;
  Sandbox.create = async () => sandbox;
  const warnCalls = [];
  const origWarn = console.warn;
  console.warn = (...args) => warnCalls.push(args);
  try {
    const result = await runClaude({ prompt: 'hi' });
    assert.equal(result.answer, 'ok');
    assert.ok(
      calls.some((cmd) => typeof cmd === 'string' && cmd.startsWith('claude -p')),
      'the claude command should still run after the persona/skills write rejects',
    );
    assert.ok(
      warnCalls.some((args) => String(args[0]).includes('[sandbox-files]')),
      'the rejection should be warned, not swallowed silently',
    );
  } finally {
    Sandbox.create = origCreate;
    console.warn = origWarn;
  }
});
