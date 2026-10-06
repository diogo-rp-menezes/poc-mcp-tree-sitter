# Non-Functional Requirements (NFR) — Linguistic Isolation Desktop Tool  

> **Versão:** 1.0 · **Status:** Draft · **Owner:** Engenharia/Arquitetura  

---  

## 1. Performance  
* **NFR-P01:** Tempo de resposta das chamadas IPC entre a camada Tauri e o sidecar Express ≤ 200 ms no p95 e ≤ 500 ms no p99.  
* **NFR-P02:** Latência média de operações de cache (get/set/evict) ≤ 100 ms.  
* **NFR-P03:** Throughput mínimo de 30 requisições IPC/segundo por instância do sidecar Express sem degradação > 10 % na latência p95.  
* **Método de medição:** [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA] – utilização de scripts de carga locais (ex: wrk ou artillery) executados contra o endpoint IPC durante testes de performance automatizados.  

---  

## 2. Escalabilidade  
* **NFR-S01:** Suporte a até 50 projetos abertos simultaneamente por usuário sem aumento médio de latência > 10 % (medido pelo tempo de resposta das operações de arquivo e parsing).  
* **NFR-S02:** Não há necessidade de escalabilidade horizontal; a aplicação é destinada a execução desktop monolítica (Tauri + Node.js sidecar). Qualquer aumento de carga deve ser atendido por provisionamento de novas instâncias de desktop por usuário.  
* **NFR-S03:** Consumo de memória máximo projetado ≤ 300 MB por instância (medido via `getMemoryStats` do módulo de cache) quando 50 projetos estão ativos.  

---  

## 3. Disponibilidade & Confiabilidade  
* **NFR-A01:** Disponibilidade esperada ≥ 99 % ao mês (considerando apenas falhas do próprio aplicativo; não inclui indisponibilidade do SO ou hardware).  
* **NFR-A02:** Tempo de Recuperação (RTO) ≤ 5 s após falha inesperada do sidecar Express, mediante reinicialização automática via `handleWorkerDeath`.  
* **NFR-A03:** Objetivo de Ponto de Recuperação (RPO) ≤ 0 min – todas as alterações de projeto são gravadas imediatamente no sistema de arquivos local antes de retornar sucesso ao chamador.  
* **NFR-A04:** Não há single points of failure além do processo Node.js sidecar; a camada Tauri continua responsiva (ex: menus, janelas) enquanto o sidecar é reiniciado.  

---  

## 4. Segurança  
* **NFR-SEC01:** Dados de projeto armazenados em disco devem ser protegidos pelos mecanismos de criptografia em repouso do sistema operacional (ex: BitLocker, FileVault, LUKS); nenhum requisito de biblioteca de criptografia adicional é introduzido além do que o SO fornece.  
* **NFR-SEC02:** Comunicação entre a camada Tauri e o sidecar Express ocorre exclusivamente via IPC/Tauri, não exposta a interfaces de rede externas; portanto, não há necessidade de TLS nesse enlace.  
* **NFR-SEC03:** O aplicativo deve seguir as diretrizes do OWASP Top 10 para aplicações desktop, particularmente controle de acesso a arquivos e validação de entrada para evitar path traversal e execução de código arbitrário.  
* **NFR-SEC04:** Qualquer segredo interno (por exemplo, tokens de acesso a serviços externos futuros) deve ser rotacionado a cada 90 dias, utilizando variáveis de ambiente do processo Node.js.  

---  

## 5. Usabilidade & Acessibilidade  
* **NFR-U01:** Conformidade com WCAG 2.1 AA para todos os diálogos e menus criados com Tauri/HTML/CSS/React.  
* **NFR-U02:** Suporte a leitores de tela (ARIA labels, roles) nos fluxos críticos de criação, edição e exclusão de projetos.  
* **NFR-U03:** Interface responsiva que se adapta a janelas de 320 px a 1920 px de largura, garantindo utilização em telas de laptops e monitores externos.  

---  

## 6. Observabilidade  
* **NFR-O01:** Implementação de logs estruturados (JSON) nos níveis info, warn e error, com campos de timestamp, nível, módulo e mensagem; os logs serão escritos em arquivo local rotacionado por tamanho (ex: 10 MB) e mantidos por 7 dias. [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]  
* **NFR-O02:** Exportação de métricas básicas (contagem de chamadas IPC, latência p95/p99, uso de memória, taxa de erros) via endpoint `/metrics` no sidecar Express, no formato Prometheus. [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]  
* **NFR-O03:** Tracing distribuído simples (span‑ID e trace‑ID) para chamadas IPC críticas (parse, getOrParseTree, saveFile) usando contexto propagado através de headers personalizados; os traces serão armazenados nos mesmos arquivos de log para análise posterior. [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]  
* **NFR-O04:** Alertas configurados para: latência p95 > 250 ms, taxa de erro > 1 %, uso de memória > 80 % do limite configurado. [INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]  

---  

## 7. Manutenibilidade & Qualidade de Código  
* **NFR-M01:** Cobertura mínima de testes unitários de 80 % para todo o código TypeScript (front‑end e back‑end) medido por `vitest`.  
* **NFR-M02:** Complexidade ciclomática máxima por função ≤ 15, verificada por ferramenta de lint (eslint + plugin complexity).  
* **NFR-M03:** Documentação de API IPC mantida em formato OpenAPI (YAML) e atualizada a cada release; o arquivo será versionado junto ao código.  

---  

## 8. Compliance & Regulatório  
* **NFR-C01:** Conformidade com LGPD/GDPR – direito ao esquecimento implementado mediante exclusão completa de todos os arquivos e metadados de um projeto quando `deleteProject` é invocado.  
* **NFR-C02:** Retenção de logs de auditoria (criação, modificação, exclusão de projetos) por até 12 meses, após o que são eliminados automaticamente.  

---  

## 9. Portabilidade & Compatibilidade  
* **NFR-PO01:** Builds produzidos pelo Tauri devem ser executáveis nas duas últimas versões maiores de Windows 10/11, macOS 12 (Monterey) e posteriores, e nas distribuições Linux mais recentes (Ubuntu 22.04 LTS, Fedora 40, etc.).  
* **NFR-PO02:** Não há dependência de serviços de nuvem; a aplicação é totalmente auto‑contida e pode ser distribuída como binário desktop independente de provedor de nuvem.  

---  

## 10. Custo (Cost Efficiency)  
* **NFR-CO01:** Custo de infraestrutura por usuário ativo próximo de zero (apenas o consumo de CPU/RAM da máquina host); não há gastos recorrentes com servidores, licenças de banco de dados ou serviços de terceiros além das dependências open‑source listadas.  

---  

## 11. Rastreabilidade  
| ID | Requisito Relacionado (BRD) | Prioridade | Status de Validação |
| :--- | :--- | :--- | :--- |
| NFR-P01 | BR-08 (gerar hash único para evitar re‑parsing desnecessário) | Must | Não validado |
| NFR-P02 | BR-05 (gerenciamento de TTL e evicção de cache) | Must | Não validado |
| NFR-P03 | BR-04 (validação de linguagem antes do parsing) | Should | Não validado |
| NFR-S01 | BR-01 (impedir criação de projeto com nome duplicado) – garante que o número de projetos ativos não cresça indefinidamente | Must | Não validado |
| NFR-S02 | (nenhum – arquitetura desktop não requer scaling) | — | — |
| NFR-S03 | BR-06 (tratamento de FileAccessError) – garante uso estável de recursos de disco | Must | Não validado |
| NFR-A01 | BR-07 (handleWorkerDeath para recuperação de worker) | Must | Não validado |
| NFR-A02 | BR-07 (recuperação automática do sidecar) | Must | Não validado |
| NFR-A03 | BR-10 (respeito ao limite de tamanho máximo via setMaxSizeMB) | Must | Não validado |
| NFR-A04 | BR-03 (dispose ao excluir projeto) – evita vazamento de recursos | Must | Não validado |
| NFR-SEC01 | BR-06 (FileAccessError) – protege arquivos contra acesso não autorizado | Should | Não validado |
| NFR-SEC02 | (nenhum – IPC interno não exposto) | — | — |
| NFR-SEC03 | BR-09 (serialização de erros) – impede vazamento de informações sensíveis em mensagens de erro | Must | Não validado |
| NFR-SEC04 | (nenhum segredo definido ainda) | — | — |
| NFR-U01 | (nenhum requisito específico de usabilidade no BRD) | Should | Não validado |
| NFR-U02 | (nenhum requisito específico de acessibilidade no BRD) | Should | Não validado |
| NFR-U03 | (nenhum requisito específico de layout no BRD) | Should | Não validado |
| NFR-O01 | BR-02 (retorno de erro descritivo) – logs ajudam a diagnosticar | Should | Não validado |
| NFR-O02 | BR-08 (hash key) – métricas de cache ajudam a validar eficácia | Should | Não validado |
| NFR-O03 | BR-04 (detecção de linguagem) – tracing de parsing ajuda a identificar falhas | Should | Não validado |
| NFR-O04 | BR-10 (quota de armazenamento) – alertas evitam QuotaExceededError inesperado | Should | Não validado |
| NFR-M01 | (qualidade de código – suporte a todos os requisitos) | Must | Não validado |
| NFR-M02 | (qualidade de código – suporte a todos os requisitos) | Must | Não validado |
| NFR-M03 | (documentação de API – suporte a todos os requisitos IPC) | Must | Não validado |
| NFR-C01 | BR-10 (limite de tamanho) – direito ao esquecimento alinhado ao controle de quota | Must | Não validado |
| NFR-C02 | (nenhum requisito de retenção explícito no BRD) | Should | Não validado |
| NFR-PO01 | (nen requisito de portabilidade implícito no BRD – distribuição desktop) | Must | Não validado |
| NFR-PO02 | (nenhum requisito de nuvem no BRD) | — | — |
| NFR-CO01 | (nenhum requisito de custo explícito no BRD) | Should | Não validado |

---  

*Observação:* Todos os marcadores `[INFERIDO POR IA — REQUER VALIDAÇÃO HUMANA]` indicam que o conteúdo foi derivado a partir do contexto do projeto e deve ser validado pelas partes interessadas antes de ser considerado definitivo. Nenhuma tecnologia, framework ou padrão fora da stack listada no diagnóstico foi introduzido.