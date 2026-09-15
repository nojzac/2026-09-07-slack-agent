import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';

process.env.SLACK_SIGNING_SECRET = 'test-secret';
process.env.SLACK_BOT_TOKEN = 'xoxb-test';
process.env.RANDOM_MIN = '1';
process.env.RANDOM_MAX = '100';

const { POST } = await import('../api/slack/events.js');

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

function captureSlackCalls() {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  return calls;
}

test('rejects a request signed with the wrong secret', async () => {
  const res = await POST(signedRequest({ type: 'event_callback' }, { secret: 'wrong' }));
  assert.equal(res.status, 401);
});

test('answers the url_verification challenge', async () => {
  const res = await POST(signedRequest({ type: 'url_verification', challenge: 'abc123' }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { challenge: 'abc123' });
});

test('replies in thread with a number in range', async () => {
  const calls = captureSlackCalls();
  const res = await POST(
    signedRequest({
      type: 'event_callback',
      event: { type: 'app_mention', channel: 'C123', ts: '111.222', text: '<@U1> hi' },
    })
  );
  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.channel, 'C123');
  assert.equal(calls[0].body.thread_ts, '111.222');
  const n = Number(calls[0].body.text.replace(/\D/g, ''));
  assert.ok(n >= 1 && n <= 100, `out of range: ${n}`);
});

test('replies inside an existing thread, not as a new one', async () => {
  const calls = captureSlackCalls();
  await POST(
    signedRequest({
      type: 'event_callback',
      event: { type: 'app_mention', channel: 'C123', ts: '333.444', thread_ts: '111.222' },
    })
  );
  assert.equal(calls[0].body.thread_ts, '111.222');
});

test('ignores Slack retries', async () => {
  const calls = captureSlackCalls();
  const res = await POST(
    signedRequest(
      { type: 'event_callback', event: { type: 'app_mention', channel: 'C123', ts: '1.2' } },
      { headers: { 'x-slack-retry-num': '1' } }
    )
  );
  assert.equal(res.status, 200);
  assert.equal(calls.length, 0);
});

test('a missing env var is a 500, not a 401', async () => {
  const saved = process.env.SLACK_SIGNING_SECRET;
  delete process.env.SLACK_SIGNING_SECRET;
  try {
    const res = await POST(signedRequest({ type: 'event_callback' }));
    assert.equal(res.status, 500);
  } finally {
    process.env.SLACK_SIGNING_SECRET = saved;
  }
});
