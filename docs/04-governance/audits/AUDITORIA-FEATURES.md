# Auditoria de funcionalidades — MCP Tree-sitter Studio

Método: engine empacotado rodando em pasta limpa; as 28 ferramentas MCP executadas contra um projeto real
(54 arquivos TS); rotas REST que alimentam a UI testadas; inspeção de código das telas.
**Limite:** a UI não foi exercitada visualmente (sem navegador no sandbox). A avaliação das telas é por código e pelas rotas que as alimentam.

## 1. Bug corrigido (alto impacto)
`find_references` truncava em silêncio: `executeNativeQuery` limita a 100 matches por arquivo e o `findReferences` não passava limite.
Em `auth.ts` (200 identificadores) achou 1 de 2 ocorrências de `extractBearerToken`; `search_text` achava as 2.
Correção: `maxResults: Number.MAX_SAFE_INTEGER` (patch anexo). Reverificado: 2/2. `tsc` OK.

## 2. Ferramentas MCP (28)
### Manter (valor alto, funcionam)
get_outline, get_symbol_source, get_symbols, find_references (após correção), search_text, find_dependencies,
run_query, get_node_at_position, analyze_complexity, analyze_function_complexity, analyze_project_structure,
list_files, get_file, list_languages, list_projects_tool.

### Modificar
| Ferramenta | Evidência | Ação |
|---|---|---|
| get_ast | auth.ts (9,7 KB) → 37 KB na profundidade 1, 91 KB na 2, 551 KB na 5 | modo compacto (só nós nomeados, sem id/isNamed, sem texto); manter `get_outline` como padrão para agentes |
| find_similar_code | trecho de 1 linha casou com funções de 136 linhas, todas com similaridade 0,84 | Jaccard sobre *conjunto* de tipos de nó ignora estrutura/tamanho; usar n-gramas/multiconjunto + penalidade de tamanho, ou remover |
| build_compound_query | "and" só adiciona um comentário; "or" apenas concatena | tree-sitter já une padrões numa query; remover ou implementar de verdade |
| list_files | `extensions:[".ts"]` retorna `[]` sem erro; `["ts"]` retorna 54 | normalizar o ponto |
| register_project_tool | cria projeto **vazio** (`files: []`) | fazer escanear a pasta (hoje só existe via REST `scan-directory`) |
| safe_replace_node | valida sintaxe e rejeita (OK), mas só altera a cópia em memória; nada é gravado em disco | gravar em disco com escrita atômica, ou remover |

### Remover do MCP (ou esconder)
- **audit_project_isolation**: só confere que caminhos já validados na ingestão resolvem dentro da raiz; sempre "isolado" em uso local.
- **configure**: permite a um agente alterar limites/log do servidor.
- **clear_cache / get_cache_stats**: operacionais, sem valor para o agente.

### Não validado a fundo
adapt_query (traduz nomes de nó entre gramáticas), get_query_template_tool/list_query_templates_tool/get_node_types
(úteis para escrever queries; poderiam virar uma só), 5 prompts MCP (code_review, explain_code, explain_tree_sitter_query, suggest_improvements, project_overview).

### Lacuna importante
Não existe ferramenta MCP para **abrir uma pasta**. O agente só trabalha em projetos que alguém escaneou antes pela REST/UI.

## 3. UI e servidor
### Código morto (nenhuma referência; remoção sem impacto funcional)
| Item | Linhas |
|---|---|
| components/CodeMiniMap.tsx (0 importações) | 270 |
| components/Header.tsx (importado, nunca renderizado) | 147 |
| components/Sidebar.tsx (componente nunca renderizado; só o tipo NavTab é usado → mover o tipo) | 139 |
| store.ts `initDefaultProjects` (definida, nunca chamada) | ~210 |
| **Total** | **~766** |

### Sobreposição / valor baixo no desktop
- **Modo "browser" do scan** (`webkitdirectory`): duplica o scan no servidor; no desktop o scan local é o caminho certo.
- **Console SQLite**: expõe só as tabelas internas (cópia dos arquivos); útil para depuração, não para o usuário final → esconder atrás de flag de desenvolvedor.
- **Git com escrita** (init/stage/commit/branch/sync): `git-sync` regrava arquivos do store sobre o disco e `git-init` define autor "AI Studio". Manter só `git-status` (leitura) até haver edição segura.
- **Auditoria de isolamento** (aba/rota): ver acima.
- **MCPConnectModal**: usa `window.location.origin` (bom com porta dinâmica), mas não mostra o token; a configuração copiada não funciona sem ele.
- **ProjectManagerView**: 2.572 linhas num componente; candidato a divisão.

### Rotas REST sem consumidor claro na UI (não validadas)
import-github, clone, batch-create, ast-export, export (450 KB no projeto de teste).

## 4. Rotas REST testadas (OK)
overview (1,1 s — agrega métricas do projeto inteiro), structure, file-stats, isolation-audit, cache/stats, templates, languages,
database/schema, similarity, analyze, search-text, symbols, complexity.

## 5. Ordem sugerida
1. Aplicar a correção do `find_references` (feita).
2. Remover o código morto (~766 linhas) e rodar `tsc` + testes.
3. Tirar do MCP: audit_project_isolation, configure, clear_cache, get_cache_stats.
4. Consertar: list_files, build_compound_query, register_project_tool (passa a escanear).
5. Decidir find_similar_code (reescrever ou remover) e safe_replace_node (gravar em disco ou remover).
6. Desktop: remover modo browser, esconder SQLite e Git de escrita, token no MCPConnectModal.
