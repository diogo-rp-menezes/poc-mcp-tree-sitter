# Validação do restante (API + UI) — mcp-treesitter POC

Ambiente: Linux, Node 22.22, servidor em modo produção com auth (Bearer), root de workspace = `src/`.
UI exercitada em Chromium headless (Playwright). Nenhum código do projeto foi alterado nesta etapa.
Limite: o Monaco foi servido localmente por interceptação (o sandbox bloqueia o CDN); sem isso o editor não inicia.

## A. Achados novos (não estavam na auditoria anterior)

| # | Sev. | Achado | Evidência | Correção sugerida |
|---|------|--------|-----------|-------------------|
| 1 | **Alta** | **Escrita em disco fora das roots permitidas.** `workspaceRoots` só vale em `scan-directory`. `batch-create`, `POST /api/projects` (e PUT/PATCH) aceitam `path` arbitrário; `git-sync` e `git-init` gravam em `path.join(proj.path, arquivo)`. | `batch-create` com `path:/tmp/escape-test` + `git-sync` criou `pwned.txt` e `sub/y.ts` lá. `git-init` em projeto criado sem path escreveu em `/workspace/bc-test`. | Validar `proj.path` com `validateScanDirectoryPath` na criação/edição e dentro de `syncProjectFilesToDisk` / `initProjectGitRepo`; ou ignorar o `path` do cliente e derivá-lo de uma root. |
| 2 | **Alta (desktop)** | **Dependência de CDN.** O Monaco carrega de `cdn.jsdelivr.net` (loader padrão do `@monaco-editor/react`) e as fontes de `fonts.googleapis.com`. Offline, o editor não inicia (`Monaco initialization: error`). | O bundle contém `cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs`; `index.html` linhas 11-13. | `loader.config({ monaco })` com `monaco-editor` empacotado (workers via Vite `?worker`) e fontes locais (`@fontsource`). |
| 3 | Média | **Query Studio falha na primeira execução em arquivos não-Python.** `queryInput` inicia fixo em Python (`App.tsx:97`) e só muda se o usuário escolher um modelo. | Arquivo TypeScript + "Executar" → `Bad node name 'function_definition'`, exibido como JSON cru. | Reiniciar a query ao trocar de arquivo/linguagem; remover o fallback silencioso para `templates['python']`; formatar o erro. |
| 4 | Média | **`clone` de projeto duplicado ou inexistente → 500 genérico** (deveria ser 409/404). | `POST /clone` com nome repetido e com projeto `nope`. | Mapear os erros do store para 404/409. |
| 5 | Média | **`import-github` sem token → 500 genérico** quando a API do GitHub limita (a mensagem útil só vai para o log). A validação de entrada está correta (rejeita `file://` e hosts não-GitHub). O import completo não foi validado (sem token). | Log: "Limite de requisições da API do GitHub excedido". | Responder 429/403 com a mensagem; testar com PAT. |
| 6 | Baixa | `adapt_query` typescript→rust devolve a query **inalterada, sem aviso** (só python↔typescript tem mapeamento). | Resposta idêntica à entrada. | Retornar erro ou `warnings` quando não há mapeamento. |
| 7 | Baixa | `batch-create` descarta em silêncio arquivos com path inválido (`../evil.ts`). O isolamento funciona, mas o cliente não é avisado. | `filesCount: 2` de 3 enviados. | Devolver lista `skipped`. |
| 8 | Baixa | Prompt `suggest_improvements` não inclui o conteúdo do arquivo (variável `f` lida e não usada); `code_review` e `explain_code` com arquivo inexistente geram prompt com código vazio, sem erro. | Saída dos 5 prompts. | Incluir o código; validar existência. |
| 9 | Baixa | UI: Esc não fecha o modal "Escanear Diretório"; o donut do Dashboard usa a mesma cor para TYPESCRIPT e CSS; o badge de linguagem mostra "PYTHON" sem arquivo aberto; "Camada de Isolamento 100%" parece estático. | Screenshots 01, 50, 51. | Ajustes de UI. |
| 10 | Info | O grafo D3 da AST em profundidade 5 (2.065 nós num arquivo de ~700 linhas) fica ilegível por padrão. | Screenshot 21. | Padrão em profundidade 2-3 ou treemap. |

## B. Confirmações da auditoria anterior

- `list_files` com `extensions:[".ts"]` → 0 arquivos; `["ts"]` → 57. Globs são relativos à root escaneada (`*.ts` → 83, `**/*.tsx` → 26, `src/server/*.ts` → 0).
- `build_compound_query`: "or" concatena; "and" só prefixa um comentário (sem semântica AND).
- `register_project_tool`: cria projeto com `files: []`; `list_files` devolve `[]`.
- `get_ast` (arquivo de ~700 linhas): 9,8 KB (prof. 1), 102 KB (3), 218 KB (3 + texto), 321 KB (5).
- `find_similar_code`: snippet de 1 linha (`const x = 1;`) retorna 88% de similaridade com `server/git.ts`. Na UI, o limiar padrão de 40% devolve blocos `{ ... }` com ~48%, o que confirma a baixa precisão.
- **`safe_replace_node` não grava no disco.** A resposta é `success:true` e `get_file` mostra o conteúdo novo, mas o arquivo em disco continua com o antigo. Como `git-sync` grava o store sobre o disco e um novo scan sobrescreve o store, a edição fica em estado ambíguo.
- MCP sem token → 401; os 5 prompts respondem.
- `MCPConnectModal` mostra a URL com a porta correta, mas não exibe token nem cabeçalho `Authorization`, então a configuração copiada não autentica.
- Segurança que funcionou: `scan-directory` bloqueia `/etc` e `../` (403); o token via `#token=` é consumido e removido da URL.

## C. UI — resultado por tela

| Tela | Resultado |
|------|-----------|
| Explorer / árvore de arquivos | OK (85 arquivos) |
| Editor Monaco | OK **somente** com Monaco local (ver A2) |
| Inspetor: Árvore AST | Renderiza (ver A10) |
| Inspetor: Diagnósticos | OK (0 erros) |
| Inspetor: Query Studio | Falha no 1º uso (A3); funciona após escolher um modelo |
| Inspetor: Símbolos | OK (7 funções em `apiAuth.ts`) |
| Inspetor: Complexidade | OK (score 18) |
| Inspetor: Similaridade | Funciona, com resultado de baixa qualidade |
| Dashboard / Project Manager | OK; mostra Importar GitHub, Escanear Diretório, Novo Projeto e Git |
| Escanear Diretório | Duas abas: "Caminho do Sistema" (campo de texto; sugestões `/workspace`, `./src`, `/projects`) e "Pasta do Computador" (modo browser). Não há seletor nativo de pasta. |
| SQLite / Console MCP | Renderizam (vistos na 1ª bateria); não executei consultas nem ferramentas por eles |

Console do navegador: nenhum erro de aplicação além dos bloqueios de CDN do sandbox.

## D. Ainda não validado

Import completo do GitHub (precisa de token), `git-commit` / `git-branch` / `git-stage`, execução de consultas no console SQLite, execução de ferramentas pelo Console MCP, SSE (`/mcp/sse`), Windows/macOS e o shell Tauri.

## E. Ordem sugerida

1. A1 (escrita fora da root) — segurança.
2. A2 (Monaco e fontes locais) — bloqueia o uso offline do desktop.
3. A3 (Query Studio) e a ferramenta MCP para abrir pasta (lacuna já apontada).
4. `list_files`, `build_compound_query`, `register_project_tool` e `safe_replace_node` (gravar em disco ou remover).
5. A4 a A9.
