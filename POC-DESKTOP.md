# POC desktop (Tauri + engine sidecar)

Objetivo: provar que o engine roda **empacotado** (sem tsx, sem node_modules) e que o Tauri
só precisa orquestrá-lo. A lógica de análise **não foi alterada**.

## Mudanças no código (todas opt-in por variável de ambiente)
| Arquivo | Mudança |
|---|---|
| `src/server/treeSitter.ts` | `MCP_ASSETS_DIR`: localiza `tree-sitter.wasm` (locateFile) e `grammars/` |
| `src/server/parseWorkerPool.ts` | `MCP_WORKER_FILE`: worker JS pré-compilado (sem loader tsx) |
| `src/client/apiAuth.ts` | aceita `#token=...` na URL inicial (sem `window.prompt` no desktop) |
| `scripts/build-engine.mjs` | bundle esbuild: `engine.mjs` + `worker.mjs` + WASM + `dist/` |
| `scripts/prepare-sidecar.mjs` | copia o Node atual para `src-tauri/binaries/node-<triple>` |
| `src-tauri/**`, `shell/` | casca Tauri v2 (**não compilada no sandbox**) |

## Rodar
```bash
npm i -D esbuild @tauri-apps/cli      # esbuild já vem via vite, mas declare explicitamente
npm run desktop:prepare               # build UI + engine-dist + sidecar (exige Rust instalado)
npx tauri icon caminho/logo.png       # gera src-tauri/icons (necessário p/ build)
POC_WORKSPACE_ROOT="C:\Projetos" npx tauri dev     # ou: npx tauri build
```
Requisitos: Node >= 22.5, Rust, WebView2 (Windows), `git` no PATH (rotas de Git).

## Validado (Linux x64, Node 22.22, pasta limpa sem node_modules)
- Engine sobe com Node puro; `/api/health` OK; UI servida em `/`; 401 sem token.
- `scan-directory` (54 arquivos TS), bloqueio fora da root, 28 ferramentas MCP.
- `get_symbols` e `get_ast` (arquivo de 1.480 linhas) com resultados reais.
- Worker pool no bundle: `mcp_parse_worker_jobs_completed 1`, `pool_enabled 1`.
- SQLite persiste após reinício. `tsc` OK; 184/184 testes existentes passam.
- Bundle: 2 MB de JS + ~50 MB de gramáticas.

## NÃO validado
- Compilação/execução do Tauri (`src-tauri`) e empacotamento de instalador.
- Windows/macOS (caminhos `\\?\` do resource_dir, CREATE_NO_WINDOW, nome do sidecar).
- Tamanho final (o sidecar é um Node completo, ~100 MB; Node SEA/Bun não testados).
- `node:sqlite` emite ExperimentalWarning (funciona no Node 22.22).

## Limitações conhecidas da POC (próximas etapas)
1. Root de workspace **fixa** na inicialização (`MCP_ALLOWED_WORKSPACE_ROOTS`); falta roots dinâmicos via seletor de pasta.
2. Modelo ainda é *ingest* em memória (maxFiles 150), não indexação em disco.
3. Só transporte MCP HTTP/SSE; sem stdio.
4. Sem assinatura de código, auto-update ou licenciamento.
