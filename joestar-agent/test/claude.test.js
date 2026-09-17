import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

process.env.SLACK_SIGNING_SECRET = 'test-secret';
process.env.SLACK_BOT_TOKEN = 'xoxb-test';
process.env.E2B_API_KEY = 'e2b-test';
process.env.CLAUDE_CODE_OAUTH_TOKEN = 'oauth-test';

const CLAUDE_JS_PATH = fileURLToPath(new URL('../api/_lib/claude.js', import.meta.url));
const { SANDBOX_RUNTIME_ENVS, collectOutputs } = await import('../api/_lib/claude.js');

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
