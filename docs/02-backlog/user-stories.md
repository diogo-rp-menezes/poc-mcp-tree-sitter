# User Stories Specification — Linguistic Isolation Desktop Tool

> **Épico relacionado:** Linguistic Isolation Desktop Tool (Tauri + sidecar Express) · **Sprint:** N/A (organizado por Slices/Releases) · **Status geral:** Backlog
>
> **Convenção de IDs:** US-001…US-014, mapeados 1:1 aos REQ-001…REQ-014 do Story Map. Nenhuma divergência intencional em relação ao Story Map foi introduzida.
>
> **Nota sobre handlers IPC:** o diagnóstico não detectou rotas/IPC no código; os handlers (`createProject`, `getProject`, `saveFile`, `languageForFile`, `getOrParseTree`, etc.) são os especificados nos Use Cases e no Story Map, e devem ser confirmados na implementação.
>
> **[INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]** Todas as estimativas de complexidade (Story Points, Fibonacci) são inferidas a partir do escopo descrito nos Use Cases e não foram validadas pelo time. Premissas: time familiarizado com React/TypeScript/Tauri; 1 ponto ≈ tarefa trivial de UI; 8 pontos ≈ funcionalidade com lógica de sidecar + tratamento de erros de domínio + testes.

---

## US-001 — Criar novo projeto com validação de nome duplicado

* **Priority:** Must (Slice 1 — MVP, Release 1.0)
* **Complexity:** 5 [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]
* **Épico:** E1 — Gerenciar Projetos
* **Labels:** frontend, backend, ux
* **Mapeamento:** REQ-001 ↔ UC-01

### 1. Description (INVEST)
* **As a** Desenvolvedor de Linguagens
* **I want to** criar um novo projeto fornecendo um nome único
* **So that** eu possa isolar meu trabalho de gramática/linguagem sem conflitos com projetos existentes

### 2. Business Context
É o ponto de entrada da jornada (Flow 1). Suporta a meta do BRD de ≥ 20 projetos criados por semana. Sem esta story, nenhuma outra etapa (E2–E4) é possível.

### 3. Acceptance Criteria (BDD/Gherkin)

#### Scenario 1: Criação bem-sucedida de projeto (caminho feliz)
* **Given** que a aplicação Tauri está em execução e o sidecar Express está disponível
* **And** não existe projeto com o nome "meu-projeto" no armazenamento local
* **When** o usuário clica em "Novo Projeto", digita "meu-projeto" e confirma
* **Then** o front-end envia a requisição `createProject` via IPC ao sidecar
* **And** o sidecar cria a estrutura de diretórios do projeto e registra o projeto no cache
* **And** o front-end recebe o identificador do projeto e exibe o Monaco Editor pronto para edição

#### Scenario 2: Nome com caracteres inválidos (caso de borda)
* **Given** que o diálogo "Novo Projeto" está aberto
* **When** o usuário digita um nome contendo caracteres não permitidos (ex: barra ou nulo)
* **Then** o front-end exibe mensagem de erro de validação antes de enviar qualquer requisição IPC
* **And** nenhuma requisição `createProject` é enviada ao sidecar

#### Scenario 3: Nome de projeto já existente (caminho de erro)
* **Given** que já existe um projeto chamado "meu-projeto" no armazenamento local
* **When** o usuário tenta criar um novo projeto com o nome "meu-projeto"
* **Then** o sidecar lança `ProjectConflictError` (BR-01)
* **And** o erro é serializado via `serializeError` (BR-09) e enviado ao front-end
* **And** o front-end exibe mensagem informando o conflito e nenhum recurso é criado

### 4. UI/UX Notes
* **Wireframe/Mockup:** não disponível — requer definição de design.
* **Estados da interface:** loading (aguardando resposta IPC), error (conflito de nome / nome inválido), success (editor aberto).

### 5. Technical Implementation Notes
* **Componentes/serviços afetados:** diálogo "Novo Projeto" (React), handler IPC `createProject` no sidecar Express, módulo de cache interno do sidecar.
* **Dependências técnicas:** sidecar Express disponível; validação de entrada no front-end.
* **Considerações de performance/segurança:** resposta IPC ≤ 200 ms (p95) (NFR-P01); validação contra path traversal no nome do projeto (NFR-SEC03); gravação imediata em disco antes de retornar sucesso (NFR-A03).

### 6. Out of Scope
* Notificação proativa de quota a 80 % (coberta por US-014).
* Renomear ou configurar projeto após criação.

### 7. Definition of Ready
- [ ] Critérios de aceite definidos e validados com PO
- [ ] Conjunto exato de caracteres proibidos definido (Open Issue de UC-01)
- [ ] Estimativa de esforço realizada

### 8. Definition of Done
- [ ] Código implementado e revisado (PR aprovado)
- [ ] Testes unitários (vitest) cobrindo os 3 cenários BDD
- [ ] Tipagem estrita TypeScript
- [ ] Lint/format ok
- [ ] Sem regressões de acessibilidade (NFR-U01/U02)
- [ ] Documentação da API IPC atualizada (NFR-M03)

### 9. Traceability
* **REQ:** REQ-001 (Slice 1 — MVP)
* **Use Cases relacionados:** UC-01
* **Regras de Negócio:** BR-01, BR-06, BR-09
* **NFRs relacionadas:** NFR-P01, NFR-P02, NFR-A03, NFR-SEC03, NFR-CO01
* **Riscos relacionados:** nenhum mapeado diretamente no Story Map

---

## US-002 — Abrir projeto existente

* **Priority:** Must (Slice 1 — MVP, Release 1.0)
* **Complexity:** 3 [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]
* **Épico:** E1 — Gerenciar Projetos
* **Labels:** frontend, backend
* **Mapeamento:** REQ-002 ↔ UC-02

### 1. Description (INVEST)
* **As a** Desenvolvedor de Linguagens
* **I want to** abrir um projeto existente a partir da lista de projetos
* **So that** eu possa retomar o trabalho de edição e análise de código

### 2. Business Context
Segunda etapa da jornada mínima (Flow 2 depende de Flow 1). Usada dezenas de vezes por dia; essencial para a métrica de projetos ativos por usuário.

### 3. Acceptance Criteria (BDD/Gherkin)

#### Scenario 1: Abertura bem-sucedida de projeto (caminho feliz)
* **Given** que o projeto "meu-projeto" existe no armazenamento local e o sidecar está disponível
* **When** o usuário clica em "meu-projeto" na barra lateral
* **Then** o front-end envia `getProject` com o ID do projeto via IPC
* **And** o sidecar retorna os metadados do projeto (nome, caminho, timestamp de última modificação)
* **And** o projeto é marcado como ativo no cache
* **And** o front-end carrega a árvore de arquivos e abre o arquivo padrão no Monaco Editor

#### Scenario 2: Projeto arquivado (caso de borda)
* **Given** que o projeto "meu-projeto" existe mas está marcado como arquivado
* **When** o usuário solicita abrir o projeto
* **Then** o sidecar retorna os metadados com indicador de arquivamento
* **And** o front-end exibe o projeto em cinza e desabilita a edição até o desarquivamento

#### Scenario 3: Projeto inexistente (caminho de erro)
* **Given** que não existe projeto com o nome informado
* **When** o front-end envia `getProject` com o nome inexistente
* **Then** o sidecar retorna `ProjectError` com código descritivo (BR-02), serializado via `serializeError` (BR-09)
* **And** o front-end exibe a mensagem "Projeto não encontrado"

### 4. UI/UX Notes
* **Wireframe/Mockup:** não disponível.
* **Estados da interface:** loading, empty (sem projetos), error (não encontrado / falha de disco), success.

### 5. Technical Implementation Notes
* **Componentes/serviços afetados:** barra lateral de projetos (React), tree view de arquivos, handler IPC `getProject`, índice em memória de projetos no sidecar.
* **Dependências técnicas:** US-001 (projeto previamente criado).
* **Considerações de performance/segurança:** latência IPC ≤ 200 ms p95 (NFR-P01); cache ≤ 100 ms (NFR-P02); impedir leitura fora do diretório de projetos (NFR-SEC03).

### 6. Out of Scope
* Mecanismo de desarquivamento (fluxo separado — Open Issue de UC-02).
* Exclusão de projeto (US-009).

### 7. Definition of Ready
- [ ] Critérios de aceite validados com PO
- [ ] US-001 concluída ou mock de projeto disponível
- [ ] Estimativa realizada

### 8. Definition of Done
- [ ] Código implementado e revisado
- [ ] Testes unitários cobrindo cenários BDD
- [ ] Tipagem estrita; lint ok
- [ ] Logs estruturados para erros de acesso/corrupção (NFR-O01)
- [ ] Documentação IPC atualizada

### 9. Traceability
* **REQ:** REQ-002 (Slice 1 — MVP)
* **Use Cases relacionados:** UC-02
* **Regras de Negócio:** BR-02, BR-06, BR-09
* **NFRs relacionadas:** NFR-P01, NFR-P02, NFR-A01, NFR-SEC03, NFR-O01
* **Riscos relacionados:** nenhum mapeado diretamente

---

## US-003 — Abrir arquivo do projeto no Monaco Editor

* **Priority:** Must (Slice 1 — MVP, Release 1.0)
* **Complexity:** 3 [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]
* **Épico:** E2 — Editar Arquivos
* **Labels:** frontend, backend
* **Mapeamento:** REQ-003 ↔ UC-02/UC-03

### 1. Description (INVEST)
* **As a** Desenvolvedor de Linguagens
* **I want to** abrir um arquivo do projeto no Monaco Editor
* **So that** eu possa visualizar e editar seu conteúdo

### 2. Business Context
Etapa central do Flow 2; pré-requisito para salvar (US-004) e para detecção de linguagem/parsing (US-005, US-006).

### 3. Acceptance Criteria (BDD/Gherkin)

#### Scenario 1: Abertura bem-sucedida de arquivo (caminho feliz)
* **Given** que um projeto está aberto e ativo no cache
* **And** o arquivo `src/index.js` existe dentro do diretório do projeto
* **When** o usuário seleciona `src/index.js` na árvore de arquivos
* **Then** o front-end envia `getFile` via IPC com o caminho relativo
* **And** o sidecar lê o conteúdo do disco e o retorna
* **And** o Monaco Editor exibe o conteúdo do arquivo

#### Scenario 2: Arquivo vazio (caso de borda)
* **Given** que o arquivo selecionado existe mas tem conteúdo vazio
* **When** o usuário abre o arquivo
* **Then** o Monaco Editor exibe um buffer vazio sem erro
* **And** o arquivo é marcado como aberto na sessão

#### Scenario 3: Falha de acesso ao arquivo (caminho de erro)
* **Given** que o arquivo existe mas o SO nega permissão de leitura
* **When** o sidecar tenta ler o arquivo
* **Then** o sidecar lança `FileAccessError` (BR-06), serializado via `serializeError` (BR-09)
* **And** o front-end exibe mensagem de erro sugerindo verificar permissões

### 4. UI/UX Notes
* **Wireframe/Mockup:** não disponível.
* **Estados da interface:** loading, error (acesso negado), success (conteúdo no editor), empty (arquivo vazio).

### 5. Technical Implementation Notes
* **Componentes/serviços afetados:** tree view (React), integração `@monaco-editor/react`, handler IPC `getFile` no sidecar.
* **Dependências técnicas:** US-002 (projeto ativo).
* **Considerações de performance/segurança:** validação de caminho relativo contra path traversal (NFR-SEC03); latência IPC ≤ 200 ms p95 (NFR-P01).

### 6. Out of Scope
* Realce de sintaxe baseado em AST (US-006).
* Edição e persistência (US-004).

### 7. Definition of Ready
- [ ] Critérios validados com PO
- [ ] US-002 desbloqueada
- [ ] Estimativa realizada

### 8. Definition of Done
- [ ] Código implementado e revisado
- [ ] Testes unitários dos cenários BDD
- [ ] Tipagem estrita; lint ok
- [ ] Acessibilidade do editor verificada (NFR-U02)

### 9. Traceability
* **REQ:** REQ-003 (Slice 1 — MVP)
* **Use Cases relacionados:** UC-02, UC-03
* **Regras de Negócio:** BR-06, BR-09
* **NFRs relacionadas:** NFR-P01, NFR-SEC03, NFR-U02
* **Riscos relacionados:** nenhum mapeado diretamente

---

## US-004 — Salvar arquivo com recálculo de hash

* **Priority:** Must (Slice 1 — MVP, Release 1.0)
* **Complexity:** 5 [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]
* **Épico:** E2 — Editar Arquivos
* **Labels:** frontend, backend
* **Mapeamento:** REQ-004 ↔ UC-03

### 1. Description (INVEST)
* **As a** Desenvolvedor de Linguagens
* **I want to** salvar as alterações de um arquivo com Ctrl+S
* **So that** meu trabalho seja persistido imediatamente sem re-parsing desnecessário

### 2. Business Context
Operação de mais alta frequência do produto (dezenas a centenas por hora). Otimização por hash (BR-08) é essencial para as metas de performance do MVP.

### 3. Acceptance Criteria (BDD/Gherkin)

#### Scenario 1: Gravação bem-sucedida com conteúdo alterado (caminho feliz)
* **Given** que um projeto está aberto e o arquivo `src/index.js` foi modificado no Monaco Editor
* **When** o usuário pressiona Ctrl+S
* **Then** o front-end envia `saveFile` via IPC com caminho relativo e novo conteúdo
* **And** o sidecar calcula o hash via `generateHashKey` (BR-08) e detecta diferença em relação ao hash armazenado
* **And** o sidecar grava o conteúdo no disco, atualiza o hash e invalida a árvore sintática do arquivo no cache
* **And** o front-end exibe o indicador de "salvo"

#### Scenario 2: Conteúdo não alterado — hash idêntico (caso de borda)
* **Given** que o conteúdo atual do arquivo é idêntico ao último salvo
* **When** o usuário pressiona Ctrl+S
* **Then** o sidecar detecta hash idêntico e não realiza gravação em disco
* **And** retorna confirmação de "nenhuma alteração" sem invalidar o cache

#### Scenario 3: Quota de armazenamento excedida (caminho de erro)
* **Given** que o uso de armazenamento do projeto está no limite definido por `setMaxSizeMB`
* **When** o sidecar tenta gravar o arquivo
* **Then** o sidecar lança `QuotaExceededError` (BR-10), serializado via `serializeError` (BR-09)
* **And** o front-end exibe mensagem informando o limite atingido e sugere excluir ou arquivar projetos antigos
* **And** nenhuma alteração é persistida

### 4. UI/UX Notes
* **Wireframe/Mockup:** não disponível.
* **Estados da interface:** indicador de "sujeito" (dirty), saving, saved, error (quota/acesso).

### 5. Technical Implementation Notes
* **Componentes/serviços afetados:** Monaco Editor (captura de conteúdo e atalho Ctrl+S), handler IPC `saveFile`, função `generateHashKey`, tabela de hash por arquivo no sidecar, cache de árvores sintáticas.
* **Dependências técnicas:** US-003; US-008 (quota) para o cenário de erro.
* **Considerações de performance/segurança:** latência IPC ≤ 200 ms p95 (NFR-P01); throughput ≥ 30 IPC/s (NFR-P03); RPO ≤ 0 min — gravar antes de confirmar (NFR-A03); validação de caminho (NFR-SEC03).

### 6. Out of Scope
* Salvamento automático com debounce (Open Issue de UC-03).
* "Salvar Como…" com novo nome (AS-2 de UC-03 — candidato a release futura).
* Salvamento em lote (US-012).

### 7. Definition of Ready
- [ ] Critérios validados com PO
- [ ] US-003 concluída
- [ ] Estimativa realizada

### 8. Definition of Done
- [ ] Código implementado e revisado
- [ ] Testes unitários dos 3 cenários BDD (incluindo hash idêntico)
- [ ] Métricas de saves exportadas em `/metrics` (NFR-O02)
- [ ] Tipagem estrita; lint ok

### 9. Traceability
* **REQ:** REQ-004 (Slice 1 — MVP)
* **Use Cases relacionados:** UC-03
* **Regras de Negócio:** BR-06, BR-08, BR-09, BR-10
* **NFRs relacionadas:** NFR-P01, NFR-P02, NFR-P03, NFR-A03, NFR-SEC03, NFR-CO01, NFR-O02
* **Riscos relacionados:** perda de dados (impacto Alto no BRD — mitigado por REQ-008/US-008)

---

## US-005 — Detectar linguagem do arquivo

* **Priority:** Must (Slice 1 — MVP, Release 1.0)
* **Complexity:** 5 [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]
* **Épico:** E3 — Detectar Linguagem e Analisar Código
* **Labels:** backend, frontend
* **Mapeamento:** REQ-005 ↔ UC-04

### 1. Description (INVEST)
* **As a** Desenvolvedor de Linguagens
* **I want to** que o sistema identifique automaticamente a linguagem do arquivo aberto
* **So that** o editor aplique o realce de sintaxe e os recursos corretos

### 2. Business Context
Meta do BRD: acurácia de `languageForFile` ≥ 95 %. É o gate obrigatório antes do parsing (BR-04).

### 3. Acceptance Criteria (BDD/Gherkin)

#### Scenario 1: Detecção por extensão conhecida (caminho feliz)
* **Given** que um projeto está aberto e o usuário abre o arquivo `src/main.rs`
* **When** o front-end envia `languageForFile` com o caminho relativo via IPC
* **Then** o sidecar consulta o mapa de extensões e retorna o identificador `"rust"`
* **And** o front-end configura o Monaco Editor para a linguagem detectada

#### Scenario 2: Arquivo sem extensão, detectado por shebang (caso de borda)
* **Given** que o arquivo não possui extensão reconhecível no mapa
* **And** suas primeiras linhas contêm `#!/usr/bin/env python3`
* **When** o sidecar executa a detecção por heurística de conteúdo
* **Then** o sidecar retorna o identificador `"python"`

#### Scenario 3: Linguagem não suportada (caminho de erro)
* **Given** que o arquivo não corresponde a nenhuma linguagem com gramática Tree-sitter disponível
* **When** o sidecar executa `languageForFile`
* **Then** o sidecar lança `LanguageNotFoundError` (BR-04), serializado via `serializeError` (BR-09)
* **And** o front-end exibe mensagem informando que a linguagem não é suportada e desativa os recursos avançados de sintaxe

### 4. UI/UX Notes
* **Wireframe/Mockup:** não disponível.
* **Estados da interface:** indicador de linguagem na barra de status; estado de "linguagem não suportada" com degradação graceful.

### 5. Technical Implementation Notes
* **Componentes/serviços afetados:** handler IPC `languageForFile`, mapa de extensões no sidecar, heurística de shebang, configuração de linguagem do Monaco Editor.
* **Dependências técnicas:** US-003 (arquivo aberto); `web-tree-sitter`/`tree-sitter-wasms` para o conjunto de linguagens suportadas.
* **Considerações de performance/segurança:** latência IPC ≤ 200 ms p95 (NFR-P01); validação de caminho (NFR-SEC03).

### 6. Out of Scope
* Fallback para texto simples em linguagem desconhecida (Open Issue de UC-04).
* Suporte a linguagens sem gramática Tree-sitter (Won't Have no Story Map).

### 7. Definition of Ready
- [ ] Critérios validados com PO
- [ ] Mapa de extensões inicial definido
- [ ] Estimativa realizada

### 8. Definition of Done
- [ ] Código implementado e revisado
- [ ] Testes unitários com acurácia medida ≥ 95 % no conjunto de testes
- [ ] Tipagem estrita; lint ok
- [ ] Documentação IPC atualizada

### 9. Traceability
* **REQ:** REQ-005 (Slice 1 — MVP)
* **Use Cases relacionados:** UC-04
* **Regras de Negócio:** BR-04, BR-09
* **NFRs relacionadas:** NFR-P01, NFR-P03, NFR-SEC03, NFR-O03
* **Riscos relacionados:** experiência degradada em linguagens não suportadas (risco de slicing — mitigado por mensagem clara)

---

## US-006 — Obter árvore sintática com reutilização de cache por hash

* **Priority:** Must (Slice 1 — MVP, Release 1.0)
* **Complexity:** 8 [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]
* **Épico:** E3 — Detectar Linguagem e Analisar Código
* **Labels:** backend, frontend, performance
* **Mapeamento:** REQ-006 ↔ UC-04

### 1. Description (INVEST)
* **As a** Desenvolvedor de Linguagens
* **I want to** obter a árvore sintática do arquivo, reutilizando o cache quando o conteúdo não mudou
* **So that** o realce de sintaxe seja rápido e não consuma recursos desnecessários

### 2. Business Context
Fecha a jornada ponta-a-ponta do MVP (E1→E2→E3). Meta do BRD: ≤ 2 % de erros de parsing não tratados; guardrail de latência de cache ≤ 100 ms.

### 3. Acceptance Criteria (BDD/Gherkin)

#### Scenario 1: Parsing inicial com armazenamento em cache (caminho feliz)
* **Given** que a linguagem do arquivo foi detectada como suportada
* **And** não existe entrada de cache para o hash do conteúdo atual
* **When** o front-end envia `getOrParseTree` via IPC
* **Then** o sidecar calcula o hash via `generateHashKey` (BR-08), invoca o parser Tree-sitter, armazena a árvore no cache associada ao hash
* **And** retorna a árvore sintática ao front-end para realce de sintaxe

#### Scenario 2: Cache hit — hash inalterado (caso de borda)
* **Given** que já existe uma árvore em cache para o hash do conteúdo atual
* **When** o front-end solicita `getOrParseTree`
* **Then** o sidecar retorna a árvore cached imediatamente, sem novo parsing, em ≤ 100 ms (NFR-P02)

#### Scenario 3: Falha ao carregar o parser Tree-sitter (caminho de erro)
* **Given** que o módulo WASM da gramática não pôde ser carregado
* **When** o sidecar tenta criar o parser
* **Then** o `MCPTreeSitterError` é capturado e convertido em `LanguageError` com detalhe da falha (BR-04)
* **And** o erro é serializado via `serializeError` (BR-09) e o front-end sugere recarregar a aplicação

### 4. UI/UX Notes
* **Wireframe/Mockup:** não disponível.
* **Estados da interface:** parsing em andamento (indicador sutil, sem travar a UI), realce aplicado, erro de parsing com opção de visualização simples.

### 5. Technical Implementation Notes
* **Componentes/serviços afetados:** handler IPC `getOrParseTree`, `generateHashKey`, cache de árvores sintáticas, `web-tree-sitter` + `tree-sitter-wasms`, camada de realce do Monaco Editor.
* **Dependências técnicas:** US-005 (linguagem validada antes do parsing — BR-04).
* **Considerações de performance/segurança:** memória total ≤ 300 MB com 50 projetos (NFR-S03); abortar parsing de arquivos que excedam o limite interno de tamanho (UC-04 EX-3); tracing das chamadas `getOrParseTree` (NFR-O03).

### 6. Out of Scope
* Política de evicção por TTL (US-010).
* Fallback para texto simples em linguagem desconhecida.

### 7. Definition of Ready
- [ ] Critérios validados com PO
- [ ] US-005 concluída
- [ ] Limite interno de tamanho de arquivo para parsing definido
- [ ] Estimativa realizada

### 8. Definition of Done
- [ ] Código implementado e revisado
- [ ] Testes unitários dos 3 cenários BDD
- [ ] Taxa de erros de parsing não tratados ≤ 2 % medida em testes
- [ ] Tracing instrumentado (NFR-O03); alertas de latência (NFR-O04)

### 9. Traceability
* **REQ:** REQ-006 (Slice 1 — MVP)
* **Use Cases relacionados:** UC-04
* **Regras de Negócio:** BR-04, BR-08, BR-09
* **NFRs relacionadas:** NFR-P01, NFR-P02, NFR-P03, NFR-S01, NFR-S03, NFR-SEC03, NFR-O03, NFR-O04
* **Riscos relacionados:** sobrecarga de memória (risco do BRD — mitigação parcial; evicção automática em US-010)

---

## US-007 — Serializar todos os erros ao frontend em formato consistente

* **Priority:** Must (Slice 1 — MVP, Release 1.0)
* **Complexity:** 3 [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]
* **Épico:** E2 — Editar Arquivos (transversal)
* **Labels:** backend, tech-debt
* **Mapeamento:** REQ-007 ↔ todos os UCs

### 1. Description (INVEST)
* **As a** Desenvolvedor de Linguagens
* **I want to** receber mensagens de erro claras e consistentes vindas do sidecar
* **So that** eu entenda o que falhou e como agir, sem expor detalhes internos sensíveis

### 2. Business Context
Story transversal (BR-09): todos os erros de domínio (`ProjectConflictError`, `ProjectError`, `FileAccessError`, `QuotaExceededError`, `LanguageError`, `LanguageNotFoundError`, `UpstreamError`) dependem dela. Sem serialização consistente, nenhum cenário de erro do MVP é apresentável.

### 3. Acceptance Criteria (BDD/Gherkin)

#### Scenario 1: Serialização de erro de domínio (caminho feliz)
* **Given** que o sidecar lança um erro de domínio (ex: `ProjectConflictError`)
* **When** o erro passa por `serializeError` antes de ser enviado via IPC
* **Then** o front-end recebe um objeto estruturado contendo tipo do erro, código descritivo e mensagem amigável
* **And** o front-end renderiza a mensagem sem stack trace interno

#### Scenario 2: Erro inesperado/não classificado (caso de borda)
* **Given** que o sidecar captura uma exceção genérica não mapeada
* **When** o erro é serializado
* **Then** ele é convertido em `UpstreamError` com mensagem genérica segura
* **And** o detalhe técnico é registrado apenas no log estruturado (NFR-O01)

#### Scenario 3: Falha na própria serialização (caminho de erro)
* **Given** que o objeto de erro contém dados não serializáveis
* **When** `serializeError` é invocado
* **Then** um erro de fallback mínimo (tipo + mensagem padrão) é enviado ao front-end
* **And** o incidente é registrado no log para investigação

### 4. UI/UX Notes
* **Estados da interface:** componente único de exibição de erro (toast/diálogo) consumido por todas as stories.

### 5. Technical Implementation Notes
* **Componentes/serviços afetados:** módulo `serializeError` no sidecar, camada de tratamento de erros IPC no front-end, componente de notificação (React).
* **Dependências técnicas:** nenhuma story bloqueante; é pré-requisito dos cenários de erro de US-001 a US-006 e US-008.
* **Considerações de performance/segurança:** não vazar caminhos internos ou dados sensíveis nas mensagens (NFR-SEC03).

### 6. Out of Scope
* Internacionalização das mensagens de erro.
* Códigos de erro expostos em documentação pública.

### 7. Definition of Ready
- [ ] Catálogo de erros de domínio definido (BR-01 a BR-10)
- [ ] Estimativa realizada

### 8. Definition of Done
- [ ] Código implementado e revisado
- [ ] Testes unitários cobrindo todos os tipos de erro de domínio
- [ ] Cobertura ≥ 80 % no módulo (NFR-M01)
- [ ] Logs estruturados verificados (NFR-O01)

### 9. Traceability
* **REQ:** REQ-007 (Slice 1 — MVP)
* **Use Cases relacionados:** UC-01, UC-02, UC-03, UC-04, UC-05
* **Regras de Negócio:** BR-09 (e suporte a BR-01, BR-02, BR-04, BR-06, BR-10)
* **NFRs relacionadas:** NFR-SEC03, NFR-O01, NFR-M01
* **Riscos relacionados:** vazamento de informações sensíveis em mensagens de erro (NFR-SEC03)

---

## US-008 — Bloquear gravação ao exceder quota e exibir erro claro

* **Priority:** Must (Slice 1 — MVP, Release 1.0)
* **Complexity:** 5 [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]
* **Épico:** E4 — Gerenciar Recursos e Quota
* **Labels:** backend, frontend
* **Mapeamento:** REQ-008 ↔ UC-03 (EX-1), UC-05

### 1. Description (INVEST)
* **As a** Desenvolvedor de Linguagens
* **I want to** ser impedido de gravar quando o limite de armazenamento for excedido, com uma mensagem clara
* **So that** eu não perca dados silenciosamente e saiba como liberar espaço

### 2. Business Context
BR-10 é regra explícita e o risco de perda de dados é classificado como impacto Alto no BRD — por isso está no MVP (justificativa registrada no Story Map). Meta: ≤ 1 % de projetos acionando `QuotaExceededError`.

### 3. Acceptance Criteria (BDD/Gherkin)

#### Scenario 1: Gravação dentro da quota (caminho feliz)
* **Given** que o limite de armazenamento foi definido via `setMaxSizeMB`
* **And** o tamanho total do diretório de projetos está abaixo do limite
* **When** uma operação `saveFile` grava novos dados
* **Then** a verificação de quota confirma espaço disponível e a gravação prossegue normalmente

#### Scenario 2: Limite de quota reduzido abaixo do uso atual (caso de borda)
* **Given** que o uso atual de armazenamento já está acima do novo limite
* **When** o administrador reduz o limite via `setMaxSizeMB` e uma nova gravação é tentada
* **Then** o sidecar lança imediatamente `QuotaExceededError` para a operação em curso

#### Scenario 3: Gravação bloqueada por quota excedida (caminho de erro)
* **Given** que a gravação faria o uso total ultrapassar o limite definido por `setMaxSizeMB`
* **When** o sidecar tenta persistir o arquivo
* **Then** o sidecar interrompe a gravação e lança `QuotaExceededError` (BR-10), serializado via `serializeError` (BR-09)
* **And** o front-end exibe mensagem informando o excesso e sugere excluir ou arquivar projetos antigos
* **And** nenhum dado parcial é persistido

### 4. UI/UX Notes
* **Estados da interface:** erro de quota com ação sugerida (link para gerenciar projetos); estado normal sem indicação de quota.

### 5. Technical Implementation Notes
* **Componentes/serviços afetados:** função `setMaxSizeMB`, contador interno de bytes gravados no sidecar, verificação de quota no fluxo de `saveFile`, componente de erro no front-end.
* **Dependências técnicas:** US-004 (saveFile); US-007 (serialização).
* **Considerações de performance/segurança:** contador incremental de bytes para evitar varredura completa do diretório a cada gravação (premissa de UC-05); RPO ≤ 0 min (NFR-A03).

### 6. Out of Scope
* Notificação proativa a 80 % do limite (US-014).
* Compactação/arquivamento automático de projetos (Open Issue de UC-05).

### 7. Definition of Ready
- [ ] Critérios validados com PO
- [ ] Valor padrão de `setMaxSizeMB` definido
- [ ] Estimativa realizada

### 8. Definition of Done
- [ ] Código implementado e revisado
- [ ] Testes unitários dos 3 cenários BDD
- [ ] Métrica de ocorrências de `QuotaExceededError` instrumentada (NFR-O02/O04)

### 9. Traceability
* **REQ:** REQ-008 (Slice 1 — MVP)
* **Use Cases relacionados:** UC-03 (EX-1), UC-05
* **Regras de Negócio:** BR-10, BR-09, BR-06
* **NFRs relacionadas:** NFR-A03, NFR-P03, NFR-SEC03, NFR-O04, NFR-C01
* **Riscos relacionados:** perda de dados (impacto Alto no BRD); acúmulo de projetos obsoletos sem exclusão no MVP (risco de slicing — REQ-009 em Should)

---

## US-009 — Excluir projeto removendo arquivos e liberando recursos

* **Priority:** Should (Slice 2 — Release 1.1)
* **Complexity:** 5 [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]
* **Épico:** E1 — Gerenciar Projetos
* **Labels:** backend, frontend
* **Mapeamento:** REQ-009 ↔ BR-03

### 1. Description (INVEST)
* **As a** Desenvolvedor de Linguagens
* **I want to** excluir um projeto e liberar todos os seus recursos
* **So that** eu mantenha o ambiente limpo e dentro da quota de armazenamento

### 2. Business Context
Fora do MVP por decisão de slicing (jornada mínima não depende de exclusão), mas essencial para o direito ao esquecimento (NFR-C01) e para mitigar o risco de acúmulo de projetos obsoleto atingindo quota.

### 3. Acceptance Criteria (BDD/Gherkin)

#### Scenario 1: Exclusão bem-sucedida (caminho feliz)
* **Given** que o projeto "meu-projeto" existe e está fechado
* **When** o usuário confirma a exclusão do projeto
* **Then** o sidecar remove todos os arquivos e metadados do projeto do disco
* **And** invoca `dispose` para liberar recursos associados (BR-03), incluindo entradas de cache
* **And** o projeto desaparece da lista no front-end

#### Scenario 2: Exclusão do projeto atualmente ativo (caso de borda)
* **Given** que o projeto a excluir está marcado como ativo no cache
* **When** o usuário confirma a exclusão
* **Then** o sidecar primeiro remove o projeto do cache e libera seus recursos via `dispose`
* **And** o front-end fecha as abas de arquivos do projeto antes de confirmar a exclusão

#### Scenario 3: Falha de acesso durante exclusão (caminho de erro)
* **Given** que o SO nega permissão para remover algum arquivo do projeto
* **When** o sidecar executa a exclusão
* **Then** o sidecar lança `FileAccessError` (BR-06), serializado via `serializeError` (BR-09)
* **And** o front-end exibe mensagem de erro e o projeto permanece listado

### 4. UI/UX Notes
* **Estados da interface:** diálogo de confirmação (ação destrutiva), loading, success (item removido), error.

### 5. Technical Implementation Notes
* **Componentes/serviços afetados:** handler IPC `deleteProject`, função `dispose`, cache do sidecar, lista de projetos no front-end.
* **Dependências técnicas:** US-002; US-007.
* **Considerações de performance/segurança:** exclusão completa de arquivos e metadados para conformidade LGPD/GDPR (NFR-C01); validação de caminho (NFR-SEC03); evitar vazamento de recursos (NFR-A04).

### 6. Out of Scope
* Exclusão em lote de projetos.
* Lixeira/recuperação de projeto excluído.

### 7. Definition of Ready
- [ ] Critérios validados com PO
- [ ] Comportamento de confirmação definido com UX
- [ ] Estimativa realizada

### 8. Definition of Done
- [ ] Código implementado e revisado
- [ ] Testes unitários dos 3 cenários BDD
- [ ] Log de auditoria da exclusão registrado (NFR-C02)
- [ ] Sem regressão nas métricas do MVP

### 9. Traceability
* **REQ:** REQ-009 (Slice 2 — Should)
* **Use Cases relacionados:** nenhum UC dedicado (derivado de BR-03 e NFR-C01) — **divergência justificada:** os UCs fornecidos (UC-01 a UC-05) não especificam exclusão; a story ancora-se em BR-03 (`dispose`) e NFR-C01
* **Regras de Negócio:** BR-03, BR-06, BR-09
* **NFRs relacionadas:** NFR-A04, NFR-C01, NFR-C02, NFR-SEC03
* **Riscos relacionados:** acúmulo de projetos obsoletos no MVP (risco de slicing documentado)

---

## US-010 — Invalidação automática de cache por TTL e evicção

* **Priority:** Should (Slice 2 — Release 1.1)
* **Complexity:** 5 [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]
* **Épico:** E4 — Gerenciar Recursos e Quota
* **Labels:** backend, performance
* **Mapeamento:** REQ-010 ↔ UC-05

### 1. Description (INVEST)
* **As a** Arquiteto de Sistemas
* **I want to** que o cache invalide entradas expiradas automaticamente via TTL e evicção
* **So that** o consumo de memória permaneça dentro do limite de 300 MB e dados obsoletos não sejam usados

### 2. Business Context
Mitiga o risco de "Sobrecarga de memória" do BRD em sessões longas. No MVP, a premissa de sessões curtas de beta é monitorada via `getMemoryStats` interno; esta story torna a mitigação definitiva.

### 3. Acceptance Criteria (BDD/Gherkin)

#### Scenario 1: Evicção de entradas expiradas (caminho feliz)
* **Given** que o TTL do cache foi definido via `setTTLSeconds`
* **And** existem entradas cujo tempo de vida excedeu o TTL
* **When** a tarefa periódica de manutenção do sidecar executa
* **Then** o sidecar chama `getMemoryStats`, identifica as entradas expiradas e as remove via `evictIfNeeded` (BR-05)
* **And** registra no log estruturado a quantidade de entradas removidas (NFR-O01)

#### Scenario 2: Cache vazio após evicção total (caso de borda)
* **Given** que `evictIfNeeded` removeu todas as entradas
* **When** o sidecar consulta `getMemoryStats`
* **Then** o uso retorna zero, nenhuma ação adicional é tomada e o evento é apenas registrado em log

#### Scenario 3: Falha ao obter estatísticas de memória (caminho de erro)
* **Given** que a função `getMemoryStats` lança exceção
* **When** a tarefa de manutenção executa
* **Then** o erro é tratado como `UpstreamError`, serializado (BR-09) e registrado no log
* **And** o sidecar tenta novamente após back-off, sem afetar operações do usuário

### 4. UI/UX Notes
* Sem interface de usuário nesta story (operação automática do sidecar). A visualização de estatísticas é US-013.

### 5. Technical Implementation Notes
* **Componentes/serviços afetados:** módulo de cache do sidecar (`setTTLSeconds`, `evictIfNeeded`, `getMemoryStats`), tarefa periódica interna.
* **Dependências técnicas:** US-006 (cache de árvores sintáticas existente).
* **Considerações de performance/segurança:** operações de cache ≤ 100 ms (NFR-P02); memória ≤ 300 MB (NFR-S03); alerta ao atingir 80 % do limite de memória (NFR-O04).

### 6. Out of Scope
* TTL diferenciado por tipo de dado (Open Issue de UC-05).
* Interface de estatísticas (US-013).

### 7. Definition of Ready
- [ ] Valor padrão de TTL definido
- [ ] Estimativa realizada

### 8. Definition of Done
- [ ] Código implementado e revisado
- [ ] Testes unitários dos 3 cenários BDD
- [ ] Alerta de memória > 80 % configurado (NFR-O04)

### 9. Traceability
* **REQ:** REQ-010 (Slice 2 — Should)
* **Use Cases relacionados:** UC-05
* **Regras de Negócio:** BR-05, BR-09
* **NFRs relacionadas:** NFR-P02, NFR-P03, NFR-S03, NFR-O01, NFR-O04
* **Riscos relacionados:** sobrecarga de memória em sessões longas (risco do BRD)

---

## US-011 — Recuperação automática após morte do worker sidecar

* **Priority:** Should (Slice 2 — Release 1.1)
* **Complexity:** 8 [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]
* **Épico:** E4 — Gerenciar Recursos e Quota
* **Labels:** backend, infra
* **Mapeamento:** REQ-011 ↔ BR-07

### 1. Description (INVEST)
* **As a** Desenvolvedor de Linguagens
* **I want to** que a aplicação se recupere automaticamente se o sidecar Express falhar
* **So that** eu continue trabalhando sem precisar reiniciar manualmente o aplicativo

### 2. Business Context
Risco classificado como probabilidade Baixa no BRD, mas com impacto direto na experiência. Meta de recuperação ≤ 500 ms (Story Map) e RTO ≤ 5 s (NFR-A02).

### 3. Acceptance Criteria (BDD/Gherkin)

#### Scenario 1: Reinicialização automática do sidecar (caminho feliz)
* **Given** que a aplicação Tauri está em execução com um projeto aberto
* **When** o processo do sidecar Express morre inesperadamente
* **Then** `handleWorkerDeath` detecta a falha e reinicializa o sidecar em ≤ 500 ms (BR-07)
* **And** a camada Tauri permanece responsiva durante a reinicialização (NFR-A04)
* **And** as operações subsequentes do usuário funcionam normalmente

#### Scenario 2: Falha durante operação de gravação em andamento (caso de borda)
* **Given** que uma operação `saveFile` estava em andamento quando o sidecar morreu
* **When** o sidecar é reinicializado
* **Then** a operação interrompida retorna erro serializado ao front-end (BR-09)
* **And** o front-end informa o usuário e permite tentar salvar novamente

#### Scenario 3: Falhas repetidas de reinicialização (caminho de erro)
* **Given** que o sidecar falha repetidamente ao reiniciar
* **When** o número máximo de tentativas é atingido
* **Then** o front-end exibe mensagem orientando o reinício manual da aplicação
* **And** o incidente é registrado no log estruturado para análise pós-mortem (NFR-O01)

### 4. UI/UX Notes
* **Estados da interface:** indicador discreto de "reconectando" durante a recuperação; erro persistente após tentativas esgotadas.

### 5. Technical Implementation Notes
* **Componentes/serviços afetados:** função `handleWorkerDeath`, gerenciamento do processo sidecar Express pela camada Tauri, fila de requisições IPC durante indisponibilidade.
* **Dependências técnicas:** US-007 (serialização de erros).
* **Considerações de performance/segurança:** RTO ≤ 5 s (NFR-A02); disponibilidade ≥ 99 %/mês (NFR-A01); logs detalhados desde o MVP para pós-mortem (mitigação do risco de slicing).

### 6. Out of Scope
* Recuperação de estado de sessão (abas abertas) após reinício.
* Múltiplas instâncias de sidecar.

### 7. Definition of Ready
- [ ] Política de tentativas de reinício definida
- [ ] Estimativa realizada

### 8. Definition of Done
- [ ] Código implementado e revisado
- [ ] Testes de integração simulando morte do processo
- [ ] Tempo de recuperação medido ≤ 500 ms em teste
- [ ] Logs de incidente verificados

### 9. Traceability
* **REQ:** REQ-011 (Slice 2 — Should)
* **Use Cases relacionados:** nenhum UC dedicado (derivado de BR-07) — **divergência justificada:** os UCs fornecidos não cobrem recuperação de worker; a story ancora-se em BR-07 e NFR-A02/A04
* **Regras de Negócio:** BR-07, BR-09
* **NFRs relacionadas:** NFR-A01, NFR-A02, NFR-A04, NFR-O01
* **Riscos relacionados:** falha do sidecar no MVP exigindo reinício manual (risco de slicing documentado)

---

## US-012 — Salvar múltiplos arquivos em lote

* **Priority:** Should (Slice 2 — Release 1.1)
* **Complexity:** 5 [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]
* **Épico:** E2 — Editar Arquivos
* **Labels:** backend, frontend
* **Mapeamento:** REQ-012 ↔ UC-03

### 1. Description (INVEST)
* **As a** Desenvolvedor de Linguagens
* **I want to** salvar todos os arquivos modificados de uma vez
* **So that** eu não precise salvar arquivo por arquivo ao trocar de contexto

### 2. Business Context
Extensão natural de `saveFile` (UC-03), melhorando a produtividade em sessões com muitos arquivos abertos. Não bloqueia a jornada mínima, por isso está em Should.

### 3. Acceptance Criteria (BDD/Gherkin)

#### Scenario 1: Salvamento em lote bem-sucedido (caminho feliz)
* **Given** que três arquivos do projeto estão modificados no editor
* **When** o usuário aciona "Salvar Todos"
* **Then** o front-end envia `saveFilesBatch` via IPC com os caminhos e conteúdos
* **And** o sidecar grava cada arquivo, recalculando os hashes via `generateHashKey` (BR-08) e invalidando as árvores correspondentes no cache
* **And** o front-end marca todos os arquivos como salvos

#### Scenario 2: Lote com alguns arquivos sem alteração (caso de borda)
* **Given** que apenas dois dos três arquivos enviados têm hash alterado
* **When** o sidecar processa o lote
* **Then** apenas os dois arquivos alterados são gravados em disco
* **And** o arquivo sem alteração é confirmado sem gravação

#### Scenario 3: Falha parcial no lote (caminho de erro)
* **Given** que um dos arquivos do lote está bloqueado pelo SO
* **When** o sidecar processa o lote
* **Then** os demais arquivos são gravados com sucesso
* **And** o arquivo com falha gera `FileAccessError` (BR-06) serializado (BR-09), identificado individualmente na resposta
* **And** o front-end destaca qual arquivo não foi salvo

### 4. UI/UX Notes
* **Estados da interface:** indicador de progresso do lote; resumo de sucessos/falhas por arquivo.

### 5. Technical Implementation Notes
* **Componentes/serviços afetados:** handler IPC `saveFilesBatch`, reutilização da lógica de `saveFile` e `generateHashKey`, gerenciamento de abas modificadas no front-end.
* **Dependências técnicas:** US-004.
* **Considerações de performance/segurança:** throughput ≥ 30 IPC/s (NFR-P03); verificação de quota por arquivo (BR-10); validação de caminhos (NFR-SEC03).

### 6. Out of Scope
* Salvamento automático agendado em lote.
* Resolução de conflitos de gravação concorrente.

### 7. Definition of Ready
- [ ] Critérios validados com PO
- [ ] US-004 concluída
- [ ] Estimativa realizada

### 8. Definition of Done
- [ ] Código implementado e revisado
- [ ] Testes unitários dos 3 cenários BDD (incluindo falha parcial)
- [ ] Sem regressão nas métricas do MVP

### 9. Traceability
* **REQ:** REQ-012 (Slice 2 — Should)
* **Use Cases relacionados:** UC-03
* **Regras de Negócio:** BR-06, BR-08, BR-09, BR-10
* **NFRs relacionadas:** NFR-P01, NFR-P03, NFR-A03, NFR-SEC03
* **Riscos relacionados:** nenhum mapeado diretamente

---

## US-013 — Exibir estatísticas de memória e cache ao administrador

* **Priority:** Could (Slice 3 — Backlog)
* **Complexity:** 3 [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]
* **Épico:** E4 — Gerenciar Recursos e Quota
* **Labels:** frontend, backend, ux
* **Mapeamento:** REQ-013 ↔ UC-05

### 1. Description (INVEST)
* **As a** Arquiteto de Sistemas
* **I want to** visualizar estatísticas de memória e cache da aplicação
* **So that** eu possa diagnosticar consumo de recursos e ajustar limites com dados reais

### 2. Business Context
Item de observabilidade para o usuário administrador. Promovido a release somente se não comprometer as guardrail metrics (taxa de `FileAccessError` ≤ +0,5 %; latência de cache ≤ 100 ms).

### 3. Acceptance Criteria (BDD/Gherkin)

#### Scenario 1: Exibição de estatísticas (caminho feliz)
* **Given** que o sidecar está em execução com cache em uso
* **When** o administrador abre o painel de estatísticas
* **Then** o front-end consulta `getMemoryStats` e `getStats` via IPC
* **And** exibe uso atual de memória do cache, quantidade de entradas e taxa de acertos

#### Scenario 2: Cache vazio (caso de borda)
* **Given** que o cache está vazio (ex: após evicção total)
* **When** o painel de estatísticas é aberto
* **Then** o painel exibe valores zerados em estado "empty" amigável, sem erro

#### Scenario 3: Falha ao obter estatísticas (caminho de erro)
* **Given** que `getMemoryStats` lança exceção
* **When** o painel tenta carregar os dados
* **Then** o erro é tratado como `UpstreamError`, serializado (BR-09)
* **And** o painel exibe mensagem de indisponibilidade temporária com opção de tentar novamente

### 4. UI/UX Notes
* **Estados da interface:** loading, empty (cache vazio), error, success (painel com dados). Visualização gráfica pode usar `recharts` (dependência já presente no projeto). [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA] — o uso de `recharts` para este painel é uma sugestão baseada na dependência existente, não um requisito confirmado.

### 5. Technical Implementation Notes
* **Componentes/serviços afetados:** handlers IPC `getMemoryStats`/`getStats`, painel de administração (React).
* **Dependências técnicas:** US-010 (manutenção de cache em operação).
* **Considerações de performance/segurança:** consultas de cache ≤ 100 ms (NFR-P02); acesso restrito a usuário administrador (premissa de UC-05).

### 6. Out of Scope
* Exportação de métricas para sistemas externos (Won't Have / Future Considerations no BRD).
* Histórico de estatísticas ao longo do tempo.

### 7. Definition of Ready
- [ ] Critérios validados com PO
- [ ] Conjunto de métricas exibidas definido
- [ ] Estimativa realizada

### 8. Definition of Done
- [ ] Código implementado e revisado
- [ ] Testes unitários dos 3 cenários BDD
- [ ] Guardrail metrics do MVP sem regressão

### 9. Traceability
* **REQ:** REQ-013 (Slice 3 — Could)
* **Use Cases relacionados:** UC-05
* **Regras de Negócio:** BR-05, BR-09
* **NFRs relacionadas:** NFR-P02, NFR-S03, NFR-O01, NFR-O02
* **Riscos relacionados:** nenhum mapeado diretamente

---

## US-014 — Notificação proativa ao atingir 80 % do limite de armazenamento

* **Priority:** Could (Slice 3 — Backlog)
* **Complexity:** 3 [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]
* **Épico:** E4 — Gerenciar Recursos e Quota
* **Labels:** frontend, backend, ux
* **Mapeamento:** REQ-014 ↔ Open Issues de UC-01/UC-05

### 1. Description (INVEST)
* **As a** Desenvolvedor de Linguagens
* **I want to** ser avisado quando o armazenamento atingir 80 % do limite
* **So that** eu possa liberar espaço antes de ser bloqueado por `QuotaExceededError`

### 2. Business Context
Mitigação do risco de surpresa com quota (Open Issues de UC-01 e UC-05; risco seção 8 do BRD). Reduz a frequência de `QuotaExceededError` (meta ≤ 1 %).

### 3. Acceptance Criteria (BDD/Gherkin)

#### Scenario 1: Notificação ao cruzar o limiar de 80 % (caminho feliz)
* **Given** que o limite de armazenamento foi definido via `setMaxSizeMB`
* **And** o uso atual está abaixo de 80 %
* **When** uma gravação eleva o uso para 80 % ou mais do limite
* **Then** o sidecar sinaliza o cruzamento do limiar e o front-end exibe notificação não bloqueante informando o percentual usado
* **And** a gravação em curso é concluída normalmente

#### Scenario 2: Notificação já exibida na sessão (caso de borda)
* **Given** que a notificação de 80 % já foi exibida na sessão atual
* **When** novas gravações mantêm o uso acima de 80 % sem atingir o limite
* **Then** a notificação não é repetida em excesso (no máximo uma exibição por sessão ou por faixa de percentual)

#### Scenario 3: Falha ao calcular o uso de armazenamento (caminho de erro)
* **Given** que o sidecar recebe `FileAccessError` ao verificar o tamanho do diretório de projetos
* **When** a verificação de limiar é executada
* **Then** o erro é serializado (BR-06, BR-09) e registrado em log
* **And** nenhuma notificação falsa é exibida ao usuário

### 4. UI/UX Notes
* **Estados da interface:** toast/banner não bloqueante com ação sugerida ("Gerenciar projetos"); não deve interromper a edição.

### 5. Technical Implementation Notes
* **Componentes/serviços afetados:** verificação de quota no sidecar (mesmo contador incremental de US-008), componente de notificação no front-end.
* **Dependências técnicas:** US-008 (infraestrutura de quota); idealmente US-009 (exclusão) como ação de mitigação oferecida.
* **Considerações de performance/segurança:** verificação incremental sem varredura de disco a cada gravação; alerta interno de memória > 80 % já coberto por NFR-O04 — esta story é o equivalente voltado ao usuário para disco.

### 6. Out of Scope
* Arquivamento/compactação automática de projetos antigos (Open Issue de UC-05).
* Configuração do limiar pelo usuário (fixo em 80 % nesta story).

### 7. Definition of Ready
- [ ] Critérios validados com PO
- [ ] Política de frequência da notificação definida
- [ ] Estimativa realizada

### 8. Definition of Done
- [ ] Código implementado e revisado
- [ ] Testes unitários dos 3 cenários BDD
- [ ] Métrica de exibições da notificação instrumentada (NFR-O02)

### 9. Traceability
* **REQ:** REQ-014 (Slice 3 — Could)
* **Use Cases relacionados:** UC-01 (Open Issue), UC-05 (Open Issue)
* **Regras de Negócio:** BR-10, BR-06, BR-09
* **NFRs relacionadas:** NFR-A03, NFR-O02, NFR-O04, NFR-CO01
* **Riscos relacionados:** surpresa do usuário com `QuotaExceededError` (risco do BRD, seção 8)

---

## Resumo de Rastreabilidade (US ↔ REQ ↔ Slice)

| US | REQ | Slice | Épico | UC principal |
| :--- | :--- | :--- | :--- | :--- |
| US-001 | REQ-001 | MVP | E1 | UC-01 |
| US-002 | REQ-002 | MVP | E1 | UC-02 |
| US-003 | REQ-003 | MVP | E2 | UC-02/UC-03 |
| US-004 | REQ-004 | MVP | E2 | UC-03 |
| US-005 | REQ-005 | MVP | E3 | UC-04 |
| US-006 | REQ-006 | MVP | E3 | UC-04 |
| US-007 | REQ-007 | MVP | E2 (transversal) | UC-01 a UC-05 |
| US-008 | REQ-008 | MVP | E4 | UC-03/UC-05 |
| US-009 | REQ-009 | Should | E1 | — (BR-03) |
| US-010 | REQ-010 | Should | E4 | UC-05 |
| US-011 | REQ-011 | Should | E4 | — (BR-07) |
| US-012 | REQ-012 | Should | E2 | UC-03 |
| US-013 | REQ-013 | Could | E4 | UC-05 |
| US-014 | REQ-014 | Could | E4 | UC-01/UC-05 (Open Issues) |

**Nota de divergência:** o artefato `use-cases` referencia stories com numeração legada US-01…US-10 (ex.: UC-01 → US-01/US-02). Este documento adota a numeração sequencial US-001…US-014 alinhada 1:1 aos REQ-001…REQ-014 do Story Map, conforme convenção obrigatória de IDs. O mapeamento legado é: US-01/US-02 → US-001; US-03/US-04 → US-002; US-05/US-06 → US-004; US-07 → US-005; US-08 → US-006; US-09 → US-010; US-10 → US-008. As stories US-003, US-007, US-009, US-011, US-012, US-013 e US-014 não possuem equivalente na numeração legada e foram derivadas diretamente do Story Map e das regras de negócio.