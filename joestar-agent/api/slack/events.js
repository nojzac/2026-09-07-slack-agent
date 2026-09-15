import { randomInt } from 'node:crypto';
import { verifySlackSignature, postMessage } from '../_lib/slack.js';

const MIN = Number(process.env.RANDOM_MIN ?? 1);
const MAX = Number(process.env.RANDOM_MAX ?? 100);

function randomNumber() {
  // randomInt is unbiased and needs no floor/range arithmetic to get right.
  return randomInt(MIN, MAX + 1);
}

// Only POST is exported, so anything else gets a 405 without reaching this code.
export async function POST(request) {
  // A missing variable is a deploy mistake, not a forged request — say so,
  // rather than letting it surface as an indistinguishable 401.
  if (!process.env.SLACK_SIGNING_SECRET || !process.env.SLACK_BOT_TOKEN) {
    console.error('[slack] missing SLACK_SIGNING_SECRET or SLACK_BOT_TOKEN');
    return new Response('server misconfigured', { status: 500 });
  }

  const rawBody = await request.text();

  const ok = verifySlackSignature({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    signature: request.headers.get('x-slack-signature'),
    timestamp: request.headers.get('x-slack-request-timestamp'),
    rawBody,
  });
  if (!ok) return new Response('invalid signature', { status: 401 });

  const payload = JSON.parse(rawBody);
  console.log('[slack] received', {
    type: payload.type,
    event: payload.event?.type,
    retry: request.headers.get('x-slack-retry-num'),
  });

  // One-off handshake when the URL is first saved in the Slack app config.
  if (payload.type === 'url_verification') {
    return Response.json({ challenge: payload.challenge });
  }

  // Slack retries anything it thinks failed; don't post the number twice.
  if (request.headers.get('x-slack-retry-num')) {
    return new Response('ok', { status: 200 });
  }

  const event = payload.event;
  if (event?.type === 'app_mention' && !event.bot_id) {
    try {
      await postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: event.channel,
        text: `🎲 ${randomNumber()}`,
        // Reply in the thread; for a top-level message, ts starts the thread.
        thread_ts: event.thread_ts ?? event.ts,
      });
      console.log('[slack] replied in', event.channel);
    } catch (err) {
      // Never 500 back at Slack: it would retry and we would fail again.
      console.error('[slack] reply failed:', err.message);
    }
  }

  return new Response('ok', { status: 200 });
}
