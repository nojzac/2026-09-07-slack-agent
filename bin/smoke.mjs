// End-to-end probes against the deployed bot. Run via bin/smoke, which supplies
// the secrets from 1Password. Each probe tests exactly one link in the chain, so
// a failure names the broken link instead of "nothing happened".
import { createHmac } from 'node:crypto';

const URL_ = process.env.SMOKE_URL ?? 'https://joestar-agent-five.vercel.app/api/slack/events';
const CHANNEL = process.env.SLACK_SMOKE_CHANNEL ?? '#bot-smoke';
const SIGNING = process.env.SLACK_SIGNING_SECRET;
const BOT = process.env.SLACK_BOT_TOKEN;

let pass = 0;
let fail = 0;
const ok = (name, detail = '') => { console.log(`  \x1b[32m✓\x1b[0m ${name.padEnd(38)} ${detail}`); pass++; };
const bad = (name, detail = '') => { console.log(`  \x1b[31m✗\x1b[0m ${name.padEnd(38)} ${detail}`); fail++; };

function sign(body) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = 'v0=' + createHmac('sha256', SIGNING).update(`v0:${ts}:${body}`).digest('hex');
  return { 'content-type': 'application/json', 'x-slack-signature': sig, 'x-slack-request-timestamp': ts };
}

const slack = async (method, body) => {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${BOT}`, 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  return res.json();
};

console.log(`\nSmoke — ${URL_}\n         channel ${CHANNEL}\n`);

// 1. Is anything deployed at all?
{
  const res = await fetch(URL_);
  res.status === 405
    ? ok('endpoint alive', 'GET → 405 (POST-only)')
    : bad('endpoint alive', `GET → ${res.status}, expected 405`);
}

// 2. Does the deployed signing secret match the vault's?
{
  const body = JSON.stringify({ type: 'url_verification', challenge: `smoke-${Date.now()}` });
  const res = await fetch(URL_, { method: 'POST', headers: sign(body), body });
  const text = await res.text();
  res.status === 200 && text.includes('smoke-')
    ? ok('signature accepted', 'challenge echoed')
    : bad('signature accepted', `${res.status} ${text.slice(0, 80)}`);
}

// 3. Is the check real, or does it wave everything through?
{
  const body = JSON.stringify({ type: 'url_verification', challenge: 'nope' });
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-slack-signature': 'v0=dead', 'x-slack-request-timestamp': Math.floor(Date.now() / 1000).toString() },
    body,
  });
  res.status === 401 ? ok('forgery rejected', '401') : bad('forgery rejected', `got ${res.status}, expected 401`);
}

// 4. Can the bot post at all? (token, chat:write, channel membership)
let rootTs = null;
let channelId = null;
{
  const r = await slack('chat.postMessage', { channel: CHANNEL, text: '🔎 smoke test — mention probe below' });
  if (r.ok) {
    rootTs = r.ts;
    channelId = r.channel;
    ok('bot can post', `${CHANNEL} (${r.channel})`);
  } else {
    bad('bot can post', r.error);
    if (r.error === 'channel_not_found') console.log(`    \x1b[2mcreate ${CHANNEL} and /invite the bot, or set SLACK_SMOKE_CHANNEL\x1b[0m`);
    if (r.error === 'not_in_channel') console.log(`    \x1b[2m/invite the bot into ${CHANNEL}\x1b[0m`);
  }
}

// 5. Does the deployed handler reply in-thread when given a real event?
if (rootTs) {
  const body = JSON.stringify({
    type: 'event_callback',
    event: { type: 'app_mention', channel: channelId, ts: rootTs, text: '<@bot> smoke' },
  });
  const res = await fetch(URL_, { method: 'POST', headers: sign(body), body });
  res.status === 200
    ? ok('handler replies to app_mention', 'posted into the thread above')
    : bad('handler replies to app_mention', `${res.status}`);
}

console.log();
if (fail === 0) {
  console.log(`  \x1b[32m${pass} passed\x1b[0m, none failed.`);
  console.log(`  \x1b[2mNot covered: Slack DISPATCHING app_mention when a human types it — only a real`);
  console.log(`  mention tests that. If all of the above pass and a mention still does nothing, the`);
  console.log(`  fault is in the Slack app's Event Subscriptions (usually unsaved). See TRAPS.md.\x1b[0m\n`);
} else {
  console.log(`  \x1b[32m${pass} passed\x1b[0m, \x1b[31m${fail} failed\x1b[0m — the first ✗ is the broken link.\n`);
}
process.exit(fail > 0 ? 1 : 0);
