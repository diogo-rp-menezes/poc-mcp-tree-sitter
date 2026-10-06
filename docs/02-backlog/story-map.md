# Story Map & Slicing Strategy — Linguistic Isolation Desktop Tool

> Baseado na metodologia de *User Story Mapping* (Jeff Patton). O eixo horizontal representa a jornada do usuário; o eixo vertical representa a priorização por release/slice.
>
> **Fontes:** BRD v1.0 (objetivos, regras BR-01 a BR-10, escopo), User Flows (Flow 1–3) e Use Cases UC-01 a UC-05. Os IDs REQ-001…REQ-014 são sequenciais e **locais a este documento** (o BRD não os numera).
>
> **Nota de mapeamento REQ ↔ US:** o artefato `use-cases` referencia user stories US-01 a US-10 (ex.: UC-01 → US-01/US-02; UC-03 → US-05/US-06; UC-04 → US-07/US-08; UC-05 → US-09/US-10), porém o artefato `user-stories` em si não foi fornecido como fonte. Onde aplicável, o mapeamento é indicado ao lado de cada REQ como referência aos US citados nos UCs.

## 1. Backbone (Atividades do Usuário)

O backbone reflete a sequência de atividades derivada dos fluxos documentados (Flow 1 → Flow 2 → Flow 3) e dos casos de uso UC-01 a UC-05:

* **Gerenciar Projetos** (criar, abrir, excluir — Flow 1, UC-01, UC-02) → **Editar Arquivos** (abrir, editar, salvar — Flow 2, UC-03) → **Detectar Linguagem e Analisar Código** (detecção, parsing, AST — Flow 2, UC-04) → **Gerenciar Recursos e Quota** (cache, TTL, limite de armazenamento — Flow 3, UC-05)

**Justificativa de alinhamento:** a ordem segue exatamente as dependências cruzadas documentadas na seção "Cross-Flow Dependencies" do artefato user-flows: Flow 2 depende de Flow 1 (projeto existente), e Flow 3 é acionado a partir de operações de gravação dos Flows 1 e 2. Nenhuma divergência intencional foi introduzida.

## 2. Horizontal Axis (User Journey Steps)

| Etapa | Objetivo do Usuário | Tarefas Associadas |
| :--- | :--- | :--- |
| **E1 — Gerenciar Projetos** | Criar um projeto isolado e abri-lo para trabalho, sem conflitos de nome | Criar projeto (`createProject`, BR-01); tratar `ProjectConflictError`; abrir projeto (`getProject`, BR-02); tratar `ProjectError`; excluir projeto com liberação de recursos (`deleteProject` + `dispose`, BR-03) |
| **E2 — Editar Arquivos** | Abrir, editar e salvar arquivos do projeto no Monaco Editor com persistência confiável | Abrir arquivo (`getFile`, BR-06); editar no Monaco Editor; salvar arquivo (`saveFile`/`saveFilesBatch`); tratar `FileAccessError`; serializar erros ao frontend (`serializeError`, BR-09) |
| **E3 — Detectar Linguagem e Analisar Código** | Obter detecção precisa de linguagem e árvore sintática reutilizável | Detectar linguagem (`languageForFile`, BR-04); tratar `LanguageError`/`LanguageNotFoundError`; gerar hash de conteúdo (`generateHashKey`, BR-08); obter árvore do cache ou via parsing (`getOrParseTree`); tratar `MCPTreeSitterError` |
| **E4 — Gerenciar Recursos e Quota** | Manter o uso de memória e disco dentro dos limites, sem perda de dados | Configurar TTL e evicção de cache (`setTTLSeconds`, `evictIfNeeded`, BR-05); consultar estatísticas (`getMemoryStats`, `getStats`); definir limite de armazenamento (`setMaxSizeMB`, BR-10); tratar `QuotaExceededError`; recuperar-se de falha do worker (`handleWorkerDeath`, BR-07) |

```mermaid
graph LR
    A[E1 - Gerenciar Projetos] --> B[E2 - Editar Arquivos]
    B --> C[E3 - Detectar Linguagem e Analisar Codigo]
    C --> D[E4 - Gerenciar Recursos e Quota]
```

## 3. Vertical Axis (MoSCoW Slicing)

### Slice 1: MVP (Must Have) — Release 1.0 (Q4/2025)

* **Objetivo do slice:** entregar a jornada ponta-a-ponta funcional mínima — criar projeto → abrir → editar/salvar arquivo → detectar linguagem → obter AST — com tratamento dos erros de domínio críticos definidos no BRD, atendendo às metas de Q4/2025 (≥ 20 projetos/semana, ≥ 95 % de acurácia de `languageForFile`, ≤ 2 % de erros de parsing não tratados).
* **Stories:**
  - **REQ-001** — Criar novo projeto com validação de nome duplicado (`createProject` + `ProjectConflictError`, BR-01) — *E1* — *(↔ US-01, US-02; UC-01; Flow 1)*
  - **REQ-002** — Abrir projeto existente e tratar projeto inexistente (`getProject` + `ProjectError`, BR-02) — *E1* — *(↔ US-03, US-04; UC-02; Flow 2)*
  - **REQ-003** — Abrir arquivo do projeto no Monaco Editor (`getFile` + `FileAccessError`, BR-06) — *E2* — *(UC-02/UC-03; Flow 2)*
  - **REQ-004** — Salvar arquivo com recálculo de hash (`saveFile` + `generateHashKey`, BR-06, BR-08) — *E2* — *(↔ US-05, US-06; UC-03; Flow 2)*
  - **REQ-005** — Detectar linguagem do arquivo (`languageForFile` + `LanguageError`/`LanguageNotFoundError`, BR-04) — *E3* — *(↔ US-07; UC-04; Flow 2)*
  - **REQ-006** — Obter árvore sintática com reutilização de cache por hash (`getOrParseTree` + `MCPTreeSitterError`, BR-04, BR-08) — *E3* — *(↔ US-08; UC-04; Flow 2)*
  - **REQ-007** — Serializar todos os erros ao frontend em formato consistente (`serializeError`, BR-09) — *transversal, ancorada em E2* — *(todos os UCs)*
  - **REQ-008** — Bloquear gravação ao exceder quota e exibir erro claro (`setMaxSizeMB` + `QuotaExceededError`, BR-10) — *E4* — *(UC-03 EX-1, UC-05; Flow 3)*

### Slice 2: Should Have — Release 1.1

* **Objetivo do slice:** robustecer a operação contínua — gerenciamento automático de cache, exclusão segura de projetos e resiliência do sidecar — reduzindo riscos de negócio mapeados no BRD (memória, worker death, perda de dados).
* **Stories:**
  - **REQ-009** — Excluir projeto removendo arquivos e liberando recursos (`deleteProject` + `dispose`, BR-03) — *E1*
  - **REQ-010** — Invalidação automática de cache por TTL e evicção (`setTTLSeconds`, `evictIfNeeded`, BR-05) — *E4* — *(↔ US-09; UC-05)*
  - **REQ-011** — Recuperação automática após morte do worker sidecar (`handleWorkerDeath`, BR-07, meta ≤ 500 ms) — *E4*
  - **REQ-012** — Salvar múltiplos arquivos em lote (`saveFilesBatch`, BR-06) — *E2* — *(UC-03; Flow 3)*

### Slice 3: Could Have — Backlog

* **Objetivo do slice:** melhorar observabilidade e experiência em cenários de borda, sem bloquear o valor central.
* **Stories:**
  - **REQ-013** — Exibir estatísticas de memória e cache ao usuário administrador (`getMemoryStats`, `getStats`) — *E4* — *(UC-05)*
  - **REQ-014** — Notificação proativa ao atingir 80 % do limite de armazenamento (mitigação de risco do BRD, seção 8) — *E4* — *(Open Issue de UC-01/UC-05)*

### Won't Have (Neste Ciclo)

* **Colaboração em tempo real / edição compartilhada** — explicitamente Out-of-Scope no BRD (seção 5).
* **Sincronização com repositórios remotos (Git, SVN) ou nuvem** — Out-of-Scope no BRD.
* **Marketplace de plugins / extensões de terceiros** — Out-of-Scope no BRD.
* **Autenticação e RBAC** — listado apenas como "Future Considerations" no BRD.
* **Exportação de relatórios para sistemas externos (ELK, Datadog)** — "Future Considerations" no BRD.
* **Suporte a linguagens sem gramática Tree-sitter disponível** — Out-of-Scope no BRD; o comportamento coberto é o erro `LanguageNotFoundError` (REQ-005).

> **[INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]** Premissas adotadas no fatiamento: (1) a numeração de releases (1.0, 1.1) e o prazo Q4/2025 derivam das metas do BRD, que não define um plano de releases formal; (2) REQ-008 foi incluído no MVP porque Flow 3 (quota excedida) está documentado como fluxo central e BR-10 é regra de negócio explícita — sem ele, o MVP arriscaria perda de dados, risco classificado como impacto "Alto" no BRD; (3) REQ-009 (excluir projeto) ficou em Should porque a jornada mínima ponta-a-ponta (criar → editar → analisar) não depende de exclusão, embora `deleteProject` esteja In-Scope no BRD.

## 4. Mapa Visual (Matriz Completa)

| | E1 — Gerenciar Projetos | E2 — Editar Arquivos | E3 — Detectar Linguagem e Analisar | E4 — Gerenciar Recursos e Quota |
| :--- | :--- | :--- | :--- | :--- |
| **MVP (Must)** | REQ-001, REQ-002 | REQ-003, REQ-004, REQ-007 | REQ-005, REQ-006 | REQ-008 |
| **Should** | REQ-009 | REQ-012 | | REQ-010, REQ-011 |
| **Could** | | | | REQ-013, REQ-014 |

*(A matriz contém exatamente os IDs REQ-001 a REQ-014 definidos na seção 3 — nem mais, nem menos.)*

## 5. Critérios de Corte entre Releases

* **MVP (Release 1.0):** só avança para "pronto para lançar" quando a jornada E1→E2→E3 funcionar ponta-a-ponta, mesmo que simplificada: criar projeto, abri-lo, abrir arquivo no Monaco, salvar, detectar linguagem e exibir AST — com todos os erros de domínio (BR-01, BR-02, BR-04, BR-06, BR-08, BR-09, BR-10) tratados e serializados. Critérios quantitativos de aceite: acurácia de `languageForFile` ≥ 95 %, erros de parsing não tratados ≤ 2 %, latência de cache ≤ 100 ms (guardrail do BRD).
* **Release 1.1 (Should):** entra em lançamento quando as operações de manutenção (exclusão com `dispose`, evicção por TTL, recuperação de worker em ≤ 500 ms) estiverem cobertas por testes e sem regressão nas métricas do MVP.
* **Could:** itens promovidos a um release somente se não comprometerem as guardrail metrics (taxa de `FileAccessError` ≤ +0,5 %; latência de cache ≤ 100 ms).

## 6. Riscos de Slicing

* **REQ-009 (excluir projeto) fora do MVP:** usuários do beta podem acumular projetos obsoletos e atingir quota mais rápido, aumentando a frequência de `QuotaExceededError`. *Mitigação:* REQ-008 já está no MVP com mensagem clara e orientação de liberação de espaço (Flow 3); monitorar a métrica de quota (meta ≤ 1 %) durante o beta fechado.
* **REQ-011 (handleWorkerDeath) fora do MVP:** uma falha do sidecar Express no MVP exigiria reinício manual da aplicação, degradando a experiência. *Mitigação:* risco classificado como probabilidade "Baixa" no BRD; registrar logs detalhados desde o MVP para análise pós-mortem e priorizar 1.1 logo após o beta.
* **REQ-010 (TTL/evicção) fora do MVP:** cache sem evicção automática pode elevar o consumo de memória em sessões longas (risco "Sobrecarga de memória" do BRD). *Mitigação:* [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA] premissa de que sessões de beta são curtas o suficiente; instrumentar `getMemoryStats` internamente desde o MVP (mesmo sem UI — REQ-013 é Could) para validar essa premissa.
* **Experiência degradada em linguagens não suportadas:** o MVP trata o caso apenas como erro (`LanguageNotFoundError`). *Mitigação:* mensagem de erro clara e desativação graceful de recursos de sintaxe, conforme UC-04 EX-1; fallback para texto simples permanece como Open Issue documentada.