// Bundles the shared API (server/api.ts) and its npm dependencies into a single ES module that
// the Supabase Edge Runtime (Deno) can run: supabase/functions/api/index.js.
//   npm run build:edge
// Deploy with: npx supabase functions deploy api --project-ref <ref> --use-api
import { build } from 'esbuild';
import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';

const builtins = new Set(builtinModules);

await build({
  entryPoints: ['server/edge.ts'],
  outfile: 'supabase/functions/api/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2022',
  minify: true,
  legalComments: 'none',
  logLevel: 'info',
  // jsPDF's optional HTML/SVG renderers are browser-only and unused by the reports
  external: ['canvg', 'html2canvas', 'dompurify'],
  // Deno only resolves Node built-ins with the node: prefix, and bundled CommonJS packages need
  // a real require() for them.
  banner: {
    js: [
      "import { createRequire as __tvCreateRequire } from 'node:module';",
      'const require = __tvCreateRequire(import.meta.url);',
      "import __tvProcess from 'node:process';",
      "import { Buffer as __tvBuffer } from 'node:buffer';",
      "import { setImmediate as __tvSetImmediate, clearImmediate as __tvClearImmediate } from 'node:timers';",
      'globalThis.process ??= __tvProcess;',
      'globalThis.Buffer ??= __tvBuffer;',
      'globalThis.global ??= globalThis;',
      'globalThis.setImmediate ??= __tvSetImmediate;',
      'globalThis.clearImmediate ??= __tvClearImmediate;',
    ].join('\n'),
  },
  plugins: [
    {
      name: 'node-prefix-builtins',
      setup(b) {
        b.onResolve({ filter: /^(node:)?process$/ }, () => ({
          path: fileURLToPath(new URL('./edge-process-shim.cjs', import.meta.url)),
        }));
        b.onResolve({ filter: /^[a-z_/]+$/ }, (args) =>
          builtins.has(args.path) ? { path: `node:${args.path}`, external: true } : undefined
        );
        b.onResolve({ filter: /^node:/ }, (args) => ({ path: args.path, external: true }));
      },
    },
  ],
});
