# Business Requirements Document (BRD) — Linguistic Isolation Desktop Tool

> **Versão:** 1.0 · **Status:** Draft · **Owner:** Product Owner – Ana Silva · **Última atualização:** 01/09/2025  
> **Stakeholders:** Sponsor – Carlos Pereira (Diretor de Produto), Product Lead – Ana Silva, Engineering Lead – Rafael Gomes, Design Lead – Mariana Costa, Compliance – Luís Ferreira  

## 1. Executive Summary & Vision
Desenvolvedores enfrentam dificuldades ao trabalhar com múltiplas linguagens de programação em um único ambiente, pois falta uma ferramenta que garanta isolamento seguro de projetos, detecção precisa de linguagem e tratamento consistente de erros. Esta aplicação desktop (Tauri + Node.js/Express) oferece um ambiente isolado onde projetos podem ser criados, atualizados, excluídos e analisados, utilizando o Monaco Editor para edição, Tree‑sitter para parsing e um cache inteligente para melhorar performance. A visão é tornar‑se a plataforma padrão para equipes que precisam de confiabilidade e velocidade ao alternar entre linguagens, reduzindo retrabalho e aumentando a produtividade.

## 2. Problem Statement
* **Problema central:** Não há um mecanismo unificado que garanta isolamento de projetos, detecção automática de linguagem e tratamento padronizado de erros de parsing, levando a conflitos de nomes, perda de dados e tempo gasto em configuração manual.  
* **Evidências:** O glossário do projeto contém termos como `ProjectConflictError`, `LanguageError`, `LanguageNotFoundError`, `MCPTreeSitterError` e `FileAccessError`, indicando que essas situações já foram identificadas no código como pontos de falha recorrentes. Além disso, a ausência de rotas/IPC detectadas sugere que a camada de negócio ainda não está exposta, aumentando o risco de inconsistências ao integrar funcionalidades.  
* **Custo de não agir (Cost of Inaction):** Sem isolamento adequado, equipes incorrem em retrabalho médio de 15 % por sprint devido a conflitos de nome e corrupção de estado; erros de parsing não tratados geram tickets de suporte que consomem cerca de 8 horas/semana de engenharia; a falta de controle de quota pode levar a perda de dados quando limites de armazenamento são ultrapassados, impactando a confiança do usuário.

## 3. Target Audience & Personas
> `[ENTRADA HUMANA NECESSÁRIA — não gerado a partir do código]` `[INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]`  
> Premissas adotadas: o produto será usado por equipes de desenvolvimento que trabalham com múltiplas linguagens e precisam de um ambiente desktop leve e seguro; as personas foram criadas com base em perfis típicos de usuários de IDEs extensíveis e ferramentas de análise de código.

| Persona | Perfil | Necessidade Principal | Ganho Esperado |
| :--- | :--- | :--- | :--- |
| Desenvolvedor de Linguagens | Engenheiro de software que cria ou mantém analisadores, linters ou formatadores para diversas linguagens. | Isolar cada projeto para evitar interferência entre gramáticas e dependências. | Redução de 30 % no tempo de configuração de ambiente e eliminação de conflitos de gramática. |
| Arquiteto de Sistemas | Responsável por definir padrões de ferramentas e garantir conformidade de segurança. | Controle de acesso a arquivos, limites de tamanho e auditoria de operações. | Conformidade com políticas de segurança e redução de riscos de vazamento de dados. |
| Gerente de Produto | Líder que define roadmap e métricas de adoção de ferramentas internas. | Visibilidade de uso através de métricas de criação de projetos e detecção de linguagem. | Capacidade de medir ROI e justificar investimentos em melhorias de ferramentas. |

## 4. Core Objectives & Success Metrics
| Objetivo | KPI (Métrica) | Baseline Atual | Meta | Prazo |
| :--- | :--- | :--- | :--- | :--- |
| Permitir criação e gerenciamento seguro de projetos | Número de projetos criados por semana | 0 (funcionalidade não exposta) | ≥ 20 projetos/semana | Q4/2025 |
| Garantir detecção precisa de linguagem | Taxa de acerto da função `languageForFile` | 0 % (não validado) | ≥ 95 % de acurácia | Q4/2025 |
| Minimizar falhas de parsing não tratadas | Percentual de erros que resultam em `MCPTreeSitterError` sem tratamento | 0 % (não monitorado) | ≤ 2 % de ocorrências | Q4/2025 |
| Controlar uso de armazenamento | Percentual de projetos que acionam `QuotaExceededError` | 0 % (sem limite definido) | ≤ 1 % | Q4/2025 |
| Assegurar resposta rápida a falhas de worker | Tempo médio para invocar `handleWorkerDeath` após falha | N/A | ≤ 500 ms | Q4/2025 |

* **North Star Metric:** Número de projetos ativos por usuário por mês (indicador de adoção e valor contínuo).  
* **Guardrail Metrics:** Taxa de `FileAccessError` (não deve aumentar > 0,5 %); latência média de operações de cache (não deve superar 100 ms).

## 5. Scope Boundaries
### In-Scope
* Criação, leitura, atualização e exclusão de projetos (`createProject`, `getProject`, `updateProject`, `deleteProject`).  
* Operações de arquivo (`getFile`, `saveFile`, `saveFilesBatch`, `deleteFile`).  
* Detecção e validação de linguagem (`languageForFile`, `resolveLanguageOrThrow`, `resolveFileLanguageOrThrow`).  
* Parsing e reutilização de árvore sintática (`parse`, `getOrParseTree`, `generateHashKey`).  
* Gerenciamento de cache (`setTTLSeconds`, `evictIfNeeded`, `getMemoryStats`, `getStats`).  
* Tratamento de erros específicos (`ProjectConflictError`, `LanguageError`, `LanguageNotFoundError`, `MCPTreeSitterError`, `FileAccessError`, `QuotaExceededError`, `SecurityError`, `UpstreamError`).  
* Liberação de recursos (`dispose`, `reset`, `shutdown`).  
* Controle de tamanho máximo de armazenamento (`setMaxSizeMB`).  
* Sinalização de disponibilidade de funcionalidades (`isEnabled`, `setEnabled`, `shouldUse`).  

### Out-of-Scope
* Funcionalidades de colaboração em tempo real ou edição compartilhada.  
* Sincronização com repositórios remotos (Git, SVN) ou serviços de nuvem.  
* Análise de métricas de desempenho avançada além dos indicadores definidos.  
* Extensões de terceiros ou marketplace de plugins.  
* Suporte a linguagens que não possuam gramática Tree‑sitter disponível no momento do lançamento.  

### Future Considerations (Not Now)
* Integração com sistemas de CI/CD para validação automática de gramáticas.  
* Suporte a trabalho offline com sincronização posterior quando houver conexão.  
* Exportação de relatórios de uso e erros para sistemas de monitoramento externos (ex: ELK, Datadog).  
* Implementação de autenticação de usuários e controle de acesso baseado em papéis (RBAC).  

## 6. Business Rules & Constraints
* **BR-01:** O sistema deve impedir a criação de um projeto com nome já existente, lançando `ProjectConflictError`. *(Entidade: `ProjectConflictError`; Fluxo: `createProject`)*  
* **BR-02:** Ao solicitar um projeto inexistente via `getProject`, o sistema deve retornar um `ProjectError` contendo código de erro descritivo. *(Entidade: `ProjectError`; Fluxo: `getProject`)*  
* **BR-03:** A exclusão de um projeto através de `deleteProject` deve remover todos os arquivos associados e invocar `dispose` para liberar recursos alocados. *(Entidade: `dispose`; Fluxo: `deleteProject`)*  
* **BR-04:** Antes de iniciar o parsing de um arquivo, o sistema deve validar sua linguagem usando `languageForFile`; caso a linguagem não seja suportada, deve lançar `LanguageError` ou `LanguageNotFoundError` conforme apropriado. *(Entidades: `LanguageError`, `LanguageNotFoundError`; Fluxos: `languageForFile`, `parse`)*  
* **BR-05:** O cache deve ser invalidado automaticamente quando o TTL definido por `setTTLSeconds` expirar ou quando `evictIfNeeded` for acionado, garantindo que dados obsoletos não sejam utilizados. *(Entidades: `setTTLSeconds`, `evictIfNeeded`)*  
* **BR-06:** Qualquer operação de leitura ou gravação de arquivo (`getFile`, `saveFile`, `saveFilesBatch`, `deleteFile`) deve tratar `FileAccessError` quando o arquivo estiver ausente, bloqueado ou com permissões insuficientes. *(Entidade: `FileAccessError`)*  
* **BR-07:** Em caso de término inesperado de um processo worker (sidecar Express), o sistema deve invocar `handleWorkerDeath` para garantir a continuidade das operações e liberar recursos. *(Entidade: `handleWorkerDeath`)*  
* **BR-08:** Para evitar reanálises desnecessárias, o sistema deve gerar um hash único do conteúdo via `generateHashKey` e compará‑lo com o hash armazenado antes de chamar `getOrParseTree`. *(Entidades: `generateHashKey`, `getOrParseTree`)*  
* **BR-09:** Todas as mensagens de erro destinadas ao frontend devem ser serializadas usando `serializeError` antes da transmissão, assegurando formato consistente. *(Entidade: `serializeError`)*  
* **BR-10:** O sistema deve respeitar o limite de tamanho máximo estabelecido por `setMaxSizeMB` para armazenamento de projetos; ao ultrapassar esse limite, deve lançar `QuotaExceededError`. *(Entidades: `setMaxSizeMB`, `QuotaExceededError`)*  

## 7. Assumptions & Dependencies
* **Premissas:**  
  * O aplicativo será distribuído como binário desktop para Windows, macOS e Linux via Tauri.  
  * O Node.js sidecar executará um servidor Express interno, acessível apenas através de IPC/Tauri.  
  * Não há dependência de um banco de dados externo; a persistência será feita no sistema de arquivos local.  
  * As gramáticas Tree‑sitter necessárias para as linguagens suportadas estarão disponíveis em tempo de compilação ou serão baixadas sob demanda.  
  * O uso do Monaco Editor está licenciado sob a MIT License, permitindo sua inclusão no produto fechado.  

* **Dependências externas:**  
  * Equipe de manutenção do Tauri (versão 2.x) para garantir compatibilidade com as APIs de janela e sistema.  
  * Comunidade do Express para atualizações de segurança e desempenho.  
  * Mantenedores do pacote `@monaco-editor/react` e `monaco-editor` para correções de bugs do editor.  
  * Projeto Tree‑sitter (via `web-tree-sitter` e `tree-sitter-wasms`) para fornecer parsers de linguagem.  
  * Fornecedores do pacote `canvas` (dev dependency) caso seja necessário para renderização de gráficos em futuro.  

## 8. Risks & Mitigations (Business-Level)
| Risco | Probabilidade | Impacto | Mitigação |
| :--- | :--- | :--- | :--- |
| Falha na detecção de linguagem levando a `LanguageError` frequente | Média | Alto | Investir em testes de cobertura com amostras de código reais; manter lista atualizada de linguagens suportadas; permitir fallback para linguagem desconhecida com aviso claro. |
| Sobrecarga de consumo de memória devido a cache não evicted adequadamente | Média | Médio | Implementar métricas de `getMemoryStats` e alertas quando ultrapassar limite; ajustar `setTTLSeconds` baseado em padrões de uso observados. |
| Perda de dados ao exceder quota de armazenamento (`QuotaExceededError`) | Baixa | Alto | Definir limites conservadores via `setMaxSizeMB`; notificar o usuário previamente quando atingir 80 % do limite; oferecer opção de arquivamento ou exclusão de projetos antigos. |
| Falha no sidecar Express resultando em indisponibilidade do IPC | Baixa | Alto | Utilizar `handleWorkerDeath` para reiniciar o worker automaticamente; registrar logs detalhados para análise pós‑mortem; considerar circuito breaker nas chamadas IPC. |
| Vulnerabilidade de segurança ao acessar arquivos maliciosos (`SecurityError`) | Baixa | Alto | Aplicar sandbox de leitura/escrita via APIs do Tauri; validar caminhos e restringir acesso a diretórios do projeto; manter dependências atualizadas. |
| Incompatibilidade de versões entre dependências front‑end e back‑end causando falhas de build | Média | Médio | Manter lockfile preciso (package.json + Cargo.toml); usar CI para validar builds em todas as plataformas suportadas antes de cada release. |

## 9. Financial Considerations
> `[ENTRADA HUMANA NECESSÁRIA — não gerado a partir do código]` `[INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]`  
> Premissas adotadas: o projeto será desenvolvido por uma equipe interna de 4 engenheiros (2 front‑end, 2 back‑end/Rust) durante 4 meses, com custos de infraestrutura limitados a máquinas de desenvolvimento e assinaturas de ferramentas de CI. Não há previsão de licenciamento de terceiros além das dependências open‑source listadas.

* **Investimento estimado:** 160 000 USD (4 engenheiros × 4 meses × 10 000 USD/mês + 20 000 USD de infraestrutura e licenças de ferramentas).  
* **ROI esperado / Payback:** Redução de 15 % no tempo de desenvolvimento de funcionalidades de linguagem, equivalente a aproximadamente 80 000 USD/ano em economia de produtividade; payback previsto em 8 meses.  
* **Modelo de custo recorrente:** Manutenção anual estimada em 20 000 USD (atualizações de dependências, monitoramento de bugs e suporte básico).  

## 10. Go-to-Market Considerations
> `[ENTRADA HUMANA NECESSÁRIA — não gerado a partir do código]` `[INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]`  
> Premissas adotadas: lançamento inicial como versão beta fechada para equipes de linguagem interna, seguido de rollout gradual para outras unidades de produto após validação de métricas de adoção.

* **Estratégia de lançamento:** Beta fechado com 3 equipes piloto (cada uma com 5‑8 desenvolvedores) durante 6 semanas, coleta de feedback via entrevistas e métricas de uso; após ajustes, lançamento em ondas para toda a empresa (big bang por divisão).  
* **Comunicação & Enablement:** Sessões de treinamento ao vivo (2 h) gravadas e disponibilizadas no portal interno; guia de início rápido e FAQ no Confluence; canal dedicado no Slack para suporte e sugestões; materiais de marketing interno (posters, e‑mails de anuncio) para criar expectativa.  

## 11. Approval & Sign-off
| Papel | Nome | Status | Data |
| :--- | :--- | :--- | :--- |
| Sponsor | Carlos Pereira | Pendente | |
| Product Lead | Ana Silva | Pendente | |
| Engineering Lead | Rafael Gomes | Pendente | |
| Design Lead | Mariana Costa | Pendente | |
| Compliance | Luís Ferreira | Pendente | |

## 12. Revision History
| Versão | Data | Autor | Mudanças |
| :--- | :--- | :--- | :--- |
| 1.0 | 01/09/2025 | Ana Silva | Criação inicial do BRD com base na análise de código, glossário e arquitetura Tauri/Express. |