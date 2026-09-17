import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

process.env.SLACK_SIGNING_SECRET = 'test-secret';
process.env.SLACK_BOT_TOKEN = 'xoxb-test';
process.env.E2B_API_KEY = 'e2b-test';
process.env.CLAUDE_CODE_OAUTH_TOKEN = 'oauth-test';

const CLAUDE_JS_PATH = fileURLToPath(new URL('../api/_lib/claude.js', import.meta.url));
const { SANDBOX_RUNTIME_ENVS } = await import('../api/_lib/claude.js');

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
