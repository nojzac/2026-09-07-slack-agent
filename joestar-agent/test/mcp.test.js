import { test } from 'node:test';
import assert from 'node:assert/strict';

import { MCP_CONFIG_PATH, buildMcpConfig } from '../api/_lib/mcp.js';

// --- deepwiki: always there, no credential ------------------------------------

test('deepwiki is always present and needs no credential', () => {
  const withKey = buildMcpConfig({ hasExaKey: true });
  const withoutKey = buildMcpConfig({ hasExaKey: false });

  const expected = { type: 'http', url: 'https://mcp.deepwiki.com/mcp' };
  assert.deepEqual(withKey.mcpServers.deepwiki, expected);
  assert.deepEqual(withoutKey.mcpServers.deepwiki, expected);
});

// --- exa: only when there is a key to give it ---------------------------------

test('a missing EXA_API_KEY omits exa rather than shipping a broken server', () => {
  const config = buildMcpConfig({ hasExaKey: false });
  assert.equal(config.mcpServers.exa, undefined);
  // The whole point: a missing key must not take deepwiki down with it.
  assert.ok(config.mcpServers.deepwiki, 'deepwiki must survive a missing exa key');
});

test('a present EXA_API_KEY adds exa as a remote http server', () => {
  const config = buildMcpConfig({ hasExaKey: true });
  assert.deepEqual(config.mcpServers.exa, {
    type: 'http',
    url: 'https://mcp.exa.ai/mcp',
    headers: { 'x-api-key': '${EXA_API_KEY}' },
  });
});

// --- the value itself never lands in the config -------------------------------

test('the config carries the literal placeholder, never a real key, even with a real key in env', () => {
  const saved = process.env.EXA_API_KEY;
  process.env.EXA_API_KEY = 'sk-do-not-leak-this-into-the-config';
  try {
    const config = buildMcpConfig({ hasExaKey: true });
    const serialized = JSON.stringify(config);
    // Claude Code expands this from its own process env at connect time; the
    // config file on disk must only ever hold the unexpanded string.
    assert.match(serialized, /\$\{EXA_API_KEY\}/);
    assert.ok(
      !serialized.includes('sk-do-not-leak-this-into-the-config'),
      'the caller decides hasExaKey; the function must not go looking for the real value',
    );
  } finally {
    if (saved === undefined) delete process.env.EXA_API_KEY;
    else process.env.EXA_API_KEY = saved;
  }
});

// --- transport shape -----------------------------------------------------------

test('every server uses the remote http transport, never a stdio/npx form', () => {
  const config = buildMcpConfig({ hasExaKey: true });
  const servers = Object.values(config.mcpServers);
  assert.ok(servers.length >= 2, 'both servers should be present when a key exists');
  for (const server of servers) {
    assert.equal(server.type, 'http');
    assert.equal(server.command, undefined, 'no stdio/npx server should ever appear here');
    assert.equal(server.args, undefined);
  }
});

test('MCP_CONFIG_PATH is outside any directory the model is told to write outputs into', () => {
  assert.match(MCP_CONFIG_PATH, /^\/tmp\//);
  assert.ok(!MCP_CONFIG_PATH.startsWith('/tmp/outputs'));
});
