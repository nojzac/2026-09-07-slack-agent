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

test('a bolded angle-bracketed URL followed by a real ">" keeps that ">" outside the link', () => {
  assert.equal(
    toMrkdwn('**<https://example.com/x>**> more'),
    '*<https://example.com/x>*> more',
  );
});

test('a bolded bare URL with a query string is not truncated at "&"', () => {
  assert.equal(
    toMrkdwn('**https://example.com/x?a=1&b=2**'),
    '*<https://example.com/x?a=1&b=2>*',
  );
});

test('a bolded bare URL inside backticks is left untouched', () => {
  assert.equal(
    toMrkdwn('`**https://example.com/x**`'),
    '`**https://example.com/x**`',
  );
});

test('a bolded bare URL followed by a period keeps the period outside the link', () => {
  assert.equal(
    toMrkdwn('See **https://example.com/x**.'),
    'See *<https://example.com/x>*.',
  );
});
