// POC: copia o Node atual como sidecar do Tauri, com o sufixo de target triple exigido pelo externalBin.
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const host = /host: (\S+)/.exec(execSync('rustc -vV', { encoding: 'utf8' }))?.[1];
if (!host) throw new Error('rustc não encontrado (instale o Rust: https://rustup.rs)');
const ext = process.platform === 'win32' ? '.exe' : '';
const dest = `src-tauri/binaries/node-${host}${ext}`;
fs.mkdirSync('src-tauri/binaries', { recursive: true });
fs.copyFileSync(process.execPath, dest);
console.log(`sidecar: ${process.version} -> ${dest}`);
