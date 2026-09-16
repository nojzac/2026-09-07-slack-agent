import { Template, defaultBuildLogger } from 'e2b/dist/index.mjs'; // see api/_lib/claude.js
import { template } from './template.mjs';

/**
 * Builds the sandbox image defined in template.mjs and registers it under a
 * name, which is what `Sandbox.create(name)` in api/_lib/claude.js asks for.
 *
 * Needs E2B_API_KEY, so run it through 1Password:
 *   op run --env-file=.env.op -- node e2b/build.mjs
 */
const name = process.env.E2B_TEMPLATE ?? 'joestar-claude';

const info = await Template.build(template, name, {
  onBuildLogs: defaultBuildLogger(),
});

console.log(`\nbuilt ${info.name} (template ${info.templateId}, build ${info.buildId})`);
