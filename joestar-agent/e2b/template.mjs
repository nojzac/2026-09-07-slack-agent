import { Template } from 'e2b/dist/index.mjs'; // see api/_lib/claude.js

/**
 * The machine Claude Code runs on. Node 24 plus the three tools Claude reaches
 * for constantly: curl, git, and ripgrep (its search tool shells out to rg).
 *
 * Build it with:  op run --env-file=../.env.op -- node e2b/build.mjs
 *
 * (The CLI's `template build` is deprecated and reads a Dockerfile, not this
 * SDK definition, so the build goes through Template.build() in build.mjs.)
 */
export const template = Template()
  .fromNodeImage('24')
  .aptInstall(['curl', 'git', 'ripgrep'])
  .npmInstall('@anthropic-ai/claude-code@latest', { g: true });
