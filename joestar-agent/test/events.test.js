import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';

process.env.SLACK_SIGNING_SECRET = 'test-secret';
process.env.SLACK_BOT_TOKEN = 'xoxb-test';
process.env.E2B_API_KEY = 'e2b-test';
process.env.CLAUDE_CODE_OAUTH_TOKEN = 'oauth-test';

const { POST, promptFrom } = await import('../api/slack/events.js');
const { parseAnswer, shellQuote } = await import('../api/_lib/claude.js');

function signedRequest(body, { secret = 'test-secret', headers = {} } = {}) {
  const raw = JSON.stringify(body);
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = 'v0=' + createHmac('sha256', secret).update(`v0:${ts}:${raw}`).digest('hex');
  return new Request('https://example.com/api/slack/events', {
    method: 'POST',
    headers: { 'x-slack-signature': sig, 'x-slack-request-timestamp': ts, ...headers },
    body: raw,
  });
}

/** Capture Slack API calls and answer them the way Slack would. */
function captureSlack() {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const method = String(url).split('/api/')[1];
    calls.push({ method, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ ok: true, ts: '999.000', channel: 'C123' }), { status: 200 });
  };
  return calls;
}

const mention = (over = {}) => ({
  type: 'event_callback',
  event: { type: 'app_mention', channel: 'C123', ts: '111.222', text: '<@U1> who are you?', ...over },
});

test('rejects a request signed with the wrong secret', async () => {
  const res = await POST(signedRequest({ type: 'event_callback' }, { secret: 'wrong' }));
  assert.equal(res.status, 401);
});

test('answers the url_verification challenge', async () => {
  const res = await POST(signedRequest({ type: 'url_verification', challenge: 'abc123' }));
  assert.deepEqual(await res.json(), { challenge: 'abc123' });
});

test('a missing Slack env var is a 500, not a 401', async () => {
  const saved = process.env.SLACK_SIGNING_SECRET;
  delete process.env.SLACK_SIGNING_SECRET;
  try {
    assert.equal((await POST(signedRequest(mention()))).status, 500);
  } finally { process.env.SLACK_SIGNING_SECRET = saved; }
});

test('ignores Slack retries, so Claude never runs twice', async () => {
  const calls = captureSlack();
  const res = await POST(signedRequest(mention(), { headers: { 'x-slack-retry-num': '1' } }));
  assert.equal(res.status, 200);
  assert.equal(calls.length, 0);
});

test('answers immediately with a placeholder, in the thread', async () => {
  const calls = captureSlack();
  globalThis.__claudeRunner = async () => 'I am Claude.';
  const res = await POST(signedRequest(mention()));
  assert.equal(res.status, 200);
  const post = calls.find(c => c.method === 'chat.postMessage');
  assert.ok(post, 'should post a placeholder');
  assert.equal(post.body.thread_ts, '111.222');
  assert.match(post.body.text, /thinking/);
});

test('edits the placeholder with Claude\'s answer', async () => {
  const calls = captureSlack();
  let release;
  const done = new Promise(r => { release = r; });
  globalThis.__claudeRunner = async () => { release(); return 'I am Claude.'; };
  await POST(signedRequest(mention()));
  await done;
  await new Promise(r => setTimeout(r, 10));
  const update = calls.find(c => c.method === 'chat.update');
  assert.ok(update, 'should edit the placeholder');
  assert.equal(update.body.ts, '999.000');
  assert.equal(update.body.text, 'I am Claude.');
});

test('says which variable is missing rather than going quiet', async () => {
  const calls = captureSlack();
  const saved = process.env.E2B_API_KEY;
  delete process.env.E2B_API_KEY;
  try {
    await POST(signedRequest(mention()));
    const post = calls.find(c => c.method === 'chat.postMessage');
    assert.match(post.body.text, /E2B_API_KEY/);
  } finally { process.env.E2B_API_KEY = saved; }
});

test('strips the bot mention so Claude gets the question', () => {
  assert.equal(promptFrom('<@U123> who are you?'), 'who are you?');
  assert.equal(promptFrom('<@U1> ask <@U2> about it'), 'ask about it');
  assert.equal(promptFrom('   <@U1>   spaced   out  '), 'spaced out');
});

test('reads the answer out of the JSON envelope, and survives a format change', () => {
  assert.equal(parseAnswer('{"result":"hello"}'), 'hello');
  assert.equal(parseAnswer('plain text'), 'plain text');
  assert.equal(parseAnswer(''), '');
});

test('a quoted prompt reaches the shell as exactly itself', () => {
  // Round-trip through a real shell rather than eyeballing the escaping: whatever
  // we quote must come back out byte-for-byte, however hostile it looks.
  const nasty = [
    "it's",
    '`rm -rf /`',
    "'; rm -rf / #",
    '$(whoami) && echo pwned',
    'line one\nline two',
    '"double" and \'single\'',
  ];
  for (const s of nasty) {
    const out = execFileSync('/bin/sh', ['-c', `printf %s ${shellQuote(s)}`]).toString();
    assert.equal(out, s, `mangled: ${JSON.stringify(s)}`);
  }
});
