import { test } from 'node:test';
import assert from 'node:assert/strict';

import { toMrkdwn } from '../api/_lib/mrkdwn.js';

test('a bolded bare URL becomes a working Slack link with bold outside it', () => {
  assert.equal(
    toMrkdwn('**https://example.com/x**'),
    '*<https://example.com/x>*',
  );
});

test('a bolded Markdown link becomes a working Slack link with bold outside it', () => {
  assert.equal(
    toMrkdwn('**[PR #5](https://example.com/x)**'),
    '*<https://example.com/x|PR #5>*',
  );
});

test('a plain URL inside a sentence is left unchanged', () => {
  assert.equal(
    toMrkdwn('See https://example.com/x for details.'),
    'See https://example.com/x for details.',
  );
});
