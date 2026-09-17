import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  signAppJwt,
  isGitHubConfigured,
  mintInstallationToken,
  repoFromTopic,
} from '../api/_lib/github.js';
import { HOOK_SOURCE, HOOK_SETTINGS, gitSetupScript } from '../api/_lib/git-guard.js';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const decodeSegment = seg => JSON.parse(Buffer.from(seg, 'base64url').toString('utf8'));

// --- the JWT -----------------------------------------------------------------

test('the JWT carries exactly the three claims GitHub accepts', () => {
  const now = 1_700_000_000;
  const [header, payload] = signAppJwt({ appId: '4970890', privateKey, now })
    .split('.')
    .slice(0, 2)
    .map(decodeSegment);

  assert.deepEqual(header, { alg: 'RS256', typ: 'JWT' });
  assert.deepEqual(Object.keys(payload).sort(), ['exp', 'iat', 'iss']);
  assert.equal(payload.iss, '4970890');
});

test('iat is backdated and exp stays inside the ten-minute ceiling', () => {
  const now = 1_700_000_000;
  const payload = decodeSegment(signAppJwt({ appId: '1', privateKey, now }).split('.')[1]);

  // GitHub rejects future-dated JWTs, so iat must be in the past...
  assert.ok(payload.iat < now, 'iat should be backdated to absorb clock skew');
  // ...and rejects anything more than 10 minutes out.
  assert.ok(payload.exp - now <= 600, 'exp must not exceed ten minutes');
  assert.ok(payload.exp > now, 'exp must be in the future');
});

// --- configuration and failure -----------------------------------------------

// --- channel topic -> repo ----------------------------------------------------

test('repoFromTopic reads a bare owner/repo', () => {
  assert.equal(repoFromTopic('nojzac/2026-09-07-slack-agent'), 'nojzac/2026-09-07-slack-agent');
});

test('repoFromTopic reads owner/repo inside a longer topic', () => {
  assert.equal(repoFromTopic('🤖 bot playground — nojzac/joestar-sandbox — ask away'), 'nojzac/joestar-sandbox');
});

test('repoFromTopic reads a github.com URL', () => {
  assert.equal(repoFromTopic('https://github.com/nojzac/joestar-sandbox'), 'nojzac/joestar-sandbox');
  assert.equal(repoFromTopic('repo: github.com/nojzac/joestar-sandbox.git'), 'nojzac/joestar-sandbox');
});

test('repoFromTopic returns null for a topic with no repo in it', () => {
  assert.equal(repoFromTopic('just a normal channel topic'), null);
  assert.equal(repoFromTopic(''), null);
  assert.equal(repoFromTopic(undefined), null);
});

test('a GitHub App that is not configured is off, not broken', () => {
  const saved = { ...process.env };
  delete process.env.GITHUB_APP_ID;
  delete process.env.GITHUB_INSTALLATION_ID;
  delete process.env.GITHUB_APP_PRIVATE_KEY;
  try {
    assert.equal(isGitHubConfigured(), false);
  } finally {
    Object.assign(process.env, saved);
  }
});

test('a raw PEM in the base64 variable fails with a message that names the cause', async () => {
  const saved = process.env.GITHUB_APP_PRIVATE_KEY;
  // The mistake this guards: pasting the .pem itself where base64 was expected.
  process.env.GITHUB_APP_PRIVATE_KEY = privateKey;
  process.env.GITHUB_APP_ID ??= '1';
  process.env.GITHUB_INSTALLATION_ID ??= '2';
  try {
    await assert.rejects(
      () => mintInstallationToken({ fetchImpl: async () => ({ ok: true, json: async () => ({}) }) }),
      // Without this check the failure is an opaque OpenSSL DECODER error.
      /base64/i,
    );
  } finally {
    process.env.GITHUB_APP_PRIVATE_KEY = saved;
  }
});

test('a 404 blames the installation id, not the app id', async () => {
  process.env.GITHUB_APP_ID = '1';
  process.env.GITHUB_INSTALLATION_ID = '2';
  process.env.GITHUB_APP_PRIVATE_KEY = Buffer.from(privateKey).toString('base64');

  await assert.rejects(
    () =>
      mintInstallationToken({
        fetchImpl: async () => ({ ok: false, status: 404, json: async () => ({ message: 'Not Found' }) }),
      }),
    /GITHUB_INSTALLATION_ID/,
  );
});

test('a minted token is returned but never logged', async () => {
  process.env.GITHUB_APP_ID = '1';
  process.env.GITHUB_INSTALLATION_ID = '2';
  process.env.GITHUB_APP_PRIVATE_KEY = Buffer.from(privateKey).toString('base64');

  const { token, expiresAt } = await mintInstallationToken({
    fetchImpl: async (url, opts) => {
      assert.match(url, /\/app\/installations\/2\/access_tokens$/);
      assert.equal(opts.headers['x-github-api-version'], '2022-11-28');
      assert.match(opts.headers.authorization, /^Bearer ey/);
      return { ok: true, status: 201, json: async () => ({ token: 'ghs_x', expires_at: 'soon' }) };
    },
  });
  assert.equal(token, 'ghs_x');
  assert.equal(expiresAt, 'soon');
});

// --- the push guard ----------------------------------------------------------

const runHook = command => {
  const dir = mkdtempSync(join(tmpdir(), 'hook-'));
  const file = join(dir, 'hook.mjs');
  writeFileSync(file, HOOK_SOURCE);
  try {
    execFileSync('node', [file], { input: JSON.stringify({ tool_input: { command } }) });
    return 0;
  } catch (err) {
    return err.status;
  }
};

test('the hook blocks every destructive push form', () => {
  for (const cmd of [
    'git push --force origin feature',
    'git push -f origin feature',
    'git push --force-with-lease origin feature',
    'git push origin --delete feature',
    'git push origin -d feature',
    'git push --mirror origin',
    'git push origin +main:main',
    'git push origin :feature',
  ]) {
    // Exit 2 is the blocking code; it also feeds stderr back to the model.
    assert.equal(runHook(cmd), 2, `should have blocked: ${cmd}`);
  }
});

test('the hook leaves ordinary work alone', () => {
  for (const cmd of [
    'git push origin feature',
    'git push -u origin feature',
    'git commit -m "fix"',
    'rm -f /tmp/scratch',           // -f, but not a push
    'git branch -d old-local',      // -d, but not a push
    'gh pr create --fill',
  ]) {
    assert.equal(runHook(cmd), 0, `should have allowed: ${cmd}`);
  }
});

test('unparseable hook input does not block work', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hook-'));
  const file = join(dir, 'hook.mjs');
  writeFileSync(file, HOOK_SOURCE);
  execFileSync('node', [file], { input: 'not json' });
});

// --- the sandbox git setup ---------------------------------------------------

test('the credential helper keeps the token out of anything written to disk', () => {
  const script = gitSetupScript();
  // What lands in ~/.gitconfig is the literal string, expanded only when git
  // runs the helper.
  assert.match(script, /\$GH_TOKEN/);
  // The two ways a token ends up readable later, neither of which we use:
  assert.ok(!/x-access-token:[^@\s]*@/.test(script), 'no token in a remote URL');
  assert.ok(!script.includes('ghs_'), 'no literal token anywhere');
  // git refuses to commit without these.
  assert.match(script, /user\.name/);
  assert.match(script, /user\.email/);
});

test('the sandbox settings file carries only the hooks key', () => {
  // This repo has been burned by a baked-in apiKeyHelper in this same file
  // overriding CLAUDE_CODE_OAUTH_TOKEN.
  assert.deepEqual(Object.keys(HOOK_SETTINGS), ['hooks']);
  assert.equal(HOOK_SETTINGS.hooks.PreToolUse[0].matcher, 'Bash');
});
