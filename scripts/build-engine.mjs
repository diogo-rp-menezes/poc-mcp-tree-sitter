// POC: empacota o engine (sem tsx / node_modules) em engine-dist/.
// Uso: npm run build && node scripts/build-engine.mjs
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const out = path.resolve('engine-dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

// Shims para dependências CJS (web-tree-sitter usa require/__dirname) dentro de um bundle ESM.
const banner = `import { createRequire as __cr } from 'node:module';
import { fileURLToPath as __fu } from 'node:url';
import { dirname as __dn } from 'node:path';
const require = __cr(import.meta.url);
const __filename = __fu(import.meta.url);
const __dirname = __dn(__filename);`;

await build({
  entryPoints: { engine: 'server.ts', worker: 'src/server/parseWorker.ts' },
  outdir: out,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  banner: { js: banner },
  external: ['vite', 'node:*'],
  logLevel: 'info',
});

// Assets: runtime e gramáticas WASM + UI buildada (servida pelo próprio engine).
fs.copyFileSync('node_modules/web-tree-sitter/tree-sitter.wasm', path.join(out, 'tree-sitter.wasm'));
fs.cpSync('node_modules/tree-sitter-wasms/out', path.join(out, 'grammars'), { recursive: true });
if (fs.existsSync('dist')) fs.cpSync('dist', path.join(out, 'dist'), { recursive: true });
console.log('engine-dist pronto');
