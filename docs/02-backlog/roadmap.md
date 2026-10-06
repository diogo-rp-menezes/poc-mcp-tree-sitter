# Product Roadmap & Sprint History — Linguistic Isolation Desktop Tool

> **Horizonte de planejamento:** Trimestral · **Última atualização:** 06/10/2026
>
> **Fontes:** Story Map (Slices 1–3, REQ-001…REQ-014), User Stories BDD (US-001…US-014). O mapeamento US ↔ REQ é 1:1 conforme convenção dos artefatos-fonte.

## 1. Strategic Themes (Now / Next / Later)

### Now (Trimestre Atual — Q4/2026)
* **Concluir e estabilizar o MVP (Release 1.0 — Slice "Must"):** entregar a jornada ponta-a-ponta E1→E2→E3 (criar projeto → abrir → editar/salvar → detectar linguagem → obter AST) com todos os erros de domínio tratados e serializados (BR-01, BR-02, BR-04, BR-06, BR-08, BR-09, BR-10). Metas de negócio associadas (BRD): ≥ 20 projetos criados/semana, acurácia de `languageForFile` ≥ 95 %, erros de parsing não tratados ≤ 2 %, latência de cache ≤ 100 ms.
  - Stories: US-001, US-002, US-003, US-004, US-005, US-006, US-007, US-008.

### Next (Próximo Trimestre — Q1/2027)
* **Robustez operacional (Release 1.1 — Slice "Should"):** gerenciamento automático de cache (TTL/evicção), exclusão segura de projetos com `dispose`, resiliência do sidecar Express (`handleWorkerDeath` ≤ 500 ms) e salvamento em lote — reduzindo os riscos de negócio do BRD (memória, worker death, perda de dados).
  - Stories: US-009, US-010, US-011, US-012.

### Later (Explorando / Backlog Estratégico)
* **Observabilidade e experiência em cenários de borda (Slice "Could"):** painel de estatísticas de memória/cache para administrador e notificação proativa de quota a 80 %. Promoção a release condicionada a não comprometer as guardrail metrics (taxa de `FileAccessError` ≤ +0,5 %; latência de cache ≤ 100 ms).
  - Stories: US-013, US-014.
* **Fora deste ciclo (Won't Have, conforme Story Map/BRD):** colaboração em tempo real, sincronização com repositórios remotos/nuvem, marketplace de plugins, autenticação/RBAC, exportação de relatórios externos, linguagens sem gramática Tree-sitter.

## 2. Upcoming Sprints

> **[INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]** Não existe histórico de sprints nem calendário de releases formal nos artefatos-fonte (o Story Map cita apenas "Release 1.0 (Q4/2025)" derivado das metas do BRD, prazo já vencido em relação à data atual de 06/10/2026). As sprints abaixo são uma proposta de planejamento. **Premissas adotadas:** (1) sprints de 2 semanas (10 dias úteis); (2) time de 2 desenvolvedores full-stack (React/TypeScript/Tauri + sidecar Express); (3) capacidade estimada de ~20 story points por sprint, com base nas complexidades inferidas no artefato user-stories (1 pt ≈ tarefa trivial de UI; 8 pts ≈ funcionalidade com lógica de sidecar + erros de domínio + testes); (4) início da Sprint 1 em 12/10/2026 (segunda-feira seguinte à data de geração).

### Sprint 1 — 12/10 a 23/10/2026
* **Meta Central (Sprint Goal):** estabelecer a fundação da jornada — criação e abertura de projetos com tratamento de erros consistente ponta-a-ponta (E1 + base transversal de erros), alinhado ao objetivo do Slice 1 do Story Map.
* **Capacidade do time:** 20 pontos [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA] (premissas acima).
* **Stories planejadas:**
  - [ ] US-007 — Serializar todos os erros ao frontend em formato consistente (3 pts) — *pré-requisito dos cenários de erro de todo o MVP*
  - [ ] US-001 — Criar novo projeto com validação de nome duplicado (5 pts)
  - [ ] US-002 — Abrir projeto existente (3 pts)
  - [ ] US-003 — Abrir arquivo do projeto no Monaco Editor (3 pts)
* **Riscos conhecidos:** conjunto exato de caracteres proibidos no nome de projeto é Open Issue de UC-01 (bloqueia DoR de US-001); handlers IPC não confirmados no código (nota do artefato user-stories).

### Sprint 2 — 26/10 a 06/11/2026
* **Meta Central (Sprint Goal):** fechar o ciclo de edição e análise — salvar com otimização por hash, detectar linguagem e obter AST com cache — completando a jornada E2→E3 do MVP e as metas de acurácia (≥ 95 %) e parsing (≤ 2 % de erros não tratados) do BRD.
* **Capacidade do time:** 20 pontos [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA].
* **Stories planejadas:**
  - [ ] US-004 — Salvar arquivo com recálculo de hash (5 pts)
  - [ ] US-005 — Detectar linguagem do arquivo (5 pts)
  - [ ] US-006 — Obter árvore sintática com reutilização de cache por hash (8 pts)
* **Riscos conhecidos:** US-006 é a story mais complexa do MVP (8 pts, integração `web-tree-sitter`/`tree-sitter-wasms`); limite interno de tamanho de arquivo para parsing ainda não definido (DoR de US-006).

### Sprint 3 — 09/11 a 20/11/2026
* **Meta Central (Sprint Goal):** proteção de dados e fechamento do MVP — bloqueio de gravação por quota (BR-10, risco de perda de dados classificado como Alto no BRD) e hardening final para o critério de corte da Release 1.0.
* **Capacidade do time:** 20 pontos [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA] (5 pts de stories + reserva para hardening, testes de aceite das métricas do MVP e correções).
* **Stories planejadas:**
  - [ ] US-008 — Bloquear gravação ao exceder quota e exibir erro claro (5 pts)
* **Riscos conhecidos:** valor padrão de `setMaxSizeMB` não definido (DoR de US-008); sem REQ-009 no MVP, usuários beta podem acumular projetos e atingir quota mais rápido (risco de slicing documentado — mitigado pela mensagem clara de US-008).

### Sprint 4 — 23/11 a 04/12/2026 (início da Release 1.1)
* **Meta Central (Sprint Goal):** iniciar robustez operacional — exclusão segura de projetos e manutenção automática de cache (E4), mitigando os riscos de memória e acúmulo de projetos obsoletos.
* **Capacidade do time:** 20 pontos [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA].
* **Stories planejadas:**
  - [ ] US-009 — Excluir projeto removendo arquivos e liberando recursos (5 pts)
  - [ ] US-010 — Invalidação automática de cache por TTL e evicção (5 pts)
  - [ ] US-012 — Salvar múltiplos arquivos em lote (5 pts)
* **Riscos conhecidos:** valor padrão de TTL não definido (DoR de US-010).

### Sprint 5 — 07/12 a 18/12/2026
* **Meta Central (Sprint Goal):** resiliência do sidecar — recuperação automática em ≤ 500 ms após morte do worker (BR-07), fechando o Slice Should.
* **Capacidade do time:** 20 pontos [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA] (8 pts de story + reserva para testes de integração com morte de processo).
* **Stories planejadas:**
  - [ ] US-011 — Recuperação automática após morte do worker sidecar (8 pts)
* **Riscos conhecidos:** política de tentativas de reinício não definida (DoR de US-011); testes de integração com kill de processo exigem infraestrutura de teste específica.

## 3. Closed Sprints

Sem histórico de sprints registrado no sistema — preencher manualmente.

## 4. Milestones & Releases

| Milestone | Data Alvo | Escopo | Status |
| :--- | :--- | :--- | :--- |
| Release 1.0 — MVP (Slice Must) | 20/11/2026 [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA] | US-001 a US-008 (REQ-001 a REQ-008): jornada E1→E2→E3 ponta-a-ponta + quota (BR-10); critérios de corte: acurácia `languageForFile` ≥ 95 %, erros de parsing ≤ 2 %, latência de cache ≤ 100 ms | Planejado |
| Beta fechado | 20/11/2026 [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA] | Validação das metas do BRD (≥ 20 projetos/semana; quota ≤ 1 % de ocorrências) com instrumentação interna de `getMemoryStats` | Planejado |
| Release 1.1 — Should | 18/12/2026 [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA] | US-009 a US-012 (REQ-009 a REQ-012): exclusão com `dispose`, TTL/evicção, `handleWorkerDeath` ≤ 500 ms, `saveFilesBatch` | Planejado |
| Release 1.2 — Could (condicional) | Q1/2027 [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA] | US-013, US-014 (REQ-013, REQ-014) — promovidas somente se não comprometerem as guardrail metrics | Backlog |

**Premissas das datas:** sprints de 2 semanas a partir de 12/10/2026, sem carry-over, capacidade de ~20 pts/sprint. O prazo "Q4/2025" citado no Story Map para a Release 1.0 está vencido em relação à data atual e foi reinterpretado como meta de negócio, não como data de entrega vigente.

## 5. Velocity Trend

Sem histórico de sprints registrado no sistema — preencher manualmente.

| Sprint | Planejado | Entregue | Observação |
| :--- | :--- | :--- | :--- |

## 6. Dependencies & Blockers Ativos

| Item | Bloqueado por | Dono | Previsão de resolução |
| :--- | :--- | :--- | :--- |
| DoR de US-001 — conjunto de caracteres proibidos no nome de projeto | Open Issue de UC-01 (decisão de produto) | PO | Antes da Sprint 1 (12/10/2026) |
| Confirmação dos handlers IPC no código (`createProject`, `getProject`, `saveFile`, `languageForFile`, `getOrParseTree`, etc.) | Diagnóstico não detectou rotas/IPC; especificação vem dos Use Cases | Tech Lead | Sprint 1 |
| DoR de US-006 — limite interno de tamanho de arquivo para parsing | Decisão técnica pendente (UC-04 EX-3) | Tech Lead | Antes da Sprint 2 (26/10/2026) |
| DoR de US-008 — valor padrão de `setMaxSizeMB` | Decisão de produto pendente | PO | Antes da Sprint 3 (09/11/2026) |
| DoR de US-010 — valor padrão de TTL do cache | Decisão técnica pendente | Tech Lead | Antes da Sprint 4 (23/11/2026) |
| DoR de US-011 — política de tentativas de reinício do sidecar | Decisão técnica pendente | Tech Lead | Antes da Sprint 5 (07/12/2026) |
| US-013/US-014 (Slice Could) | Promoção condicionada às guardrail metrics da Release 1.0/1.1 | PO | Q1/2027 |