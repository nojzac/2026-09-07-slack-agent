/**
 * MCP servers available in every sandbox: exa (web search) and deepwiki
 * (documentation), both remote HTTP. Deliberately not the npx/stdio form —
 * a new sandbox boots on every message, so a stdio server would pay its npm
 * install on every single run.
 *
 * Written to disk fresh per run and passed with --mcp-config
 * --strict-mcp-config, so a cloned repo's own .mcp.json cannot add tools the
 * bot did not choose.
 *
 * The Exa key never touches this file or any command line. `${EXA_API_KEY}`
 * below is the literal four-dollar-brace string; Claude Code expands it from
 * its own process environment only when it opens the connection. The value
 * itself reaches the sandbox as an env var on the `claude` command, the same
 * way GH_TOKEN already does — never at Sandbox.create, never baked into the
 * template.
 *
 * Tested 2026-09-17: Exa's server does not check the key until `tools/call`.
 * A bad key, and even the unexpanded literal string "${EXA_API_KEY}", both
 * complete `initialize` and `tools/list` with HTTP 200 and the full tool
 * list — "server connected" proves nothing about the key being real. That is
 * exactly why deepwiki, which needs no credential at all, is also always
 * present: if it stops working too, the fault is --mcp-config wiring, not
 * the Exa key. A missing EXA_API_KEY must not turn into a confusing
 * "invalid API key" at call time and must not take deepwiki down with it —
 * so a missing key just omits the exa server entirely.
 */
export const MCP_CONFIG_PATH = '/tmp/.joestar/mcp.json';

export function buildMcpConfig({ hasExaKey }) {
  const mcpServers = {
    deepwiki: {
      type: 'http',
      url: 'https://mcp.deepwiki.com/mcp',
    },
  };

  if (hasExaKey) {
    mcpServers.exa = {
      type: 'http',
      url: 'https://mcp.exa.ai/mcp',
      headers: { 'x-api-key': '${EXA_API_KEY}' },
    };
  }

  return { mcpServers };
}
