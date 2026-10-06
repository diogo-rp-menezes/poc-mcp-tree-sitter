# Use Case Specification: UC-01 — Criar Novo Projeto

## 1. Characterization
* **Primary Actor:** Desenvolvedor de Linguagens  
* **Secondary Actors:** Sistema (Tauri + Node.js sidecar Express)  
* **Stakeholders & Interests:**  
  * Desenvolvedor de Linguagens – deseja isolar o projeto para evitar conflitos de gramática.  
  * Arquiteto de Sistemas – quer garantir que a criação respeite limites de quota e não deixe recursos vazados.  
  * Gerente de Produto – interessado na métrica de número de projetos criados por semana.  
* **Trigger:** O usuário escolhe “Novo Projeto” no menu da aplicação e fornece um nome.  
* **Preconditions:**  
  * A aplicação Tauri está em execução e o sidecar Express está disponível.  
  * Nenhum projeto com o mesmo nome já existe no armazenamento local.  
* **Postconditions (Success Guarantee):**  
  * Um novo projeto é criado no sistema de arquivos local com o nome fornecido.  
  * O projeto está pronto para receber arquivos e seu estado está registrado no cache.  
  * Nenhum recurso é alocado indevidamente; caso o nome já exista, um `ProjectConflictError` é lançado.  
* **Scope:** Aplicação desktop Linguistic Isolation (Tauri front‑end + Express sidecar).  
* **Level:** User goal.

## 2. Main Scenario (Happy Path)
1. O Desenvolvedor de Linguagens clica em “Novo Projeto” e digita o nome “meu‑projeto”.  
2. O front‑end Tauri envia a requisição `createProject` via IPC ao sidecar Express.  
3. O sidecar verifica a inexistência de um projeto com esse nome (regra de negócio BR‑01).  
4. O sidecar cria a estrutura de diretórios para o projeto e registra o projeto no cache interno.  
5. O sidecar retorna um identificador de projeto e confirmação de criação.  
6. O front‑end exibe a interface do Monaco Editor pronta para edição.  
7. O caso de uso encerra com sucesso.

## 3. Alternative Scenarios
### AS-1: Usuário cancela a operação após digitar o nome
* **Ponto de extensão:** Passo 1 (após o nome ser digitado, antes de enviar a requisição).  
* **Passos:**  
  1. O Desenvolvedor de Linguagens clica em “Cancelar”.  
  2. Nenhuma requisição IPC é enviada.  
  3. A caixa de diálogo é fechada e o estado da aplicação permanece inalterado.  
* **Retorno ao fluxo principal:** Não; o fluxo termina aqui.

### AS-2: Nome contém caracteres inválidos (ex: barra ou nulo)
* **Ponto de extensão:** Passo 1 (validação de entrada no front‑end).  
* **Passos:**  
  1. O front‑end detecta caracteres não permitidos e exibe mensagem de erro.  
  2. O usuário corrige o nome ou cancela.  
* **Retorno ao fluxo principal:** Sim, após correção retorna ao passo 1.

## 4. Exception Scenarios
### EX-1: Nome de projeto já existente (conflito)
* **Ponto de extensão:** Passo 3 (verificação de existência no sidecar).  
* **Condição de erro:** O sidecar encontra um projeto com o mesmo nome no armazenamento local.  
* **Tratamento:**  
  * O sidecar lança `ProjectConflictError`.  
  * O erro é serializado via `serializeError` (BR‑09) e enviado ao front‑end.  
  * O front‑end exibe uma mensagem informando o conflito e impede a criação.  
  * Nenhum recurso é criado; o caso de uso termina com falha.

### EX-2: Falha ao acessar o sistema de arquivos (ex: permissão insuficiente)
* **Ponto de extensão:** Passo 4 (criação de diretórios).  
* **Condição de erro:** O sidecar recebe `FileAccessError` ao tentar criar a pasta do projeto.  
* **Tratamento:**  
  * O sidecar lança `FileAccessError`.  
  * O erro é serializado e enviado ao front‑end (BR‑06, BR‑09).  
  * O front‑end exibe mensagem de erro e sugere verificar permissões da pasta de trabalho.  
  * O caso de uso termina com falha.

## 5. Business Rules Envolvidas
* **BR-01:** O sistema deve impedir a criação de um projeto com nome já existente, lançando `ProjectConflictError`.  
* **BR-06:** Qualquer operação de leitura ou gravação de arquivo deve tratar `FileAccessError`.  
* **BR-09:** Todas as mensagens de erro destinadas ao frontend devem ser serializadas usando `serializeError`.

## 6. Non-Functional Requirements Relevantes
* **NFR-P01:** Tempo de resposta das chamadas IPC ≤ 200 ms (p95) – garante que a criação de projeto seja rápida.  
* **NFR-P02:** Latência média de operações de cache ≤ 100 ms – relevante pois o projeto é registrado no cache após criação.  
* **NFR-A03:** Objetivo de Ponto de Recuperação (RPO) ≤ 0 min – a criação é gravada imediatamente no sistema de arquivos antes de retornar sucesso.  
* **NFR-SEC03:** Controle de acesso a arquivos e validação de entrada para evitar path traversal – aplicado na validação do nome do projeto.  
* **NFR-CO01:** Custo de infraestrutura por usuário ativo próximo de zero – a criação consome apenas recursos da máquina host.

## 7. Frequency of Use
Alta frequência – esperada múltiplas vezes por dia por desenvolvedor ativo, conforme meta de ≥ 20 projetos/semana (BRD).

## 8. Assumptions
* O sidecar Express está em execução e acessível via IPC/Tauri (conforme premissas do BRD).  
* O armazenamento local possui espaço suficiente para o novo projeto (verificado posteriormente por quota).  
* O nome do projeto é fornecido em UTF‑8 e não contém sequências de escape que possam ser interpretadas como comandos de shell.

## 9. Open Issues
* Definir o conjunto exato de caracteres proibidos para nomes de projeto (necessita validação de segurança).  
* Determinar se será necessário notificar o usuário quando o armazenamento atingir 80 % do limite antes de lançar `QuotaExceededError`.

## 10. Related Artifacts
* **User Stories:** US-01 (Criar projeto), US-02 (Tratar conflito de nome).  
* **User Flow:** Referência ao fluxo “Criar Projeto” em user‑flows.md (não disponível no diagnóstico).  
* **API envolvida:** IPC handler `createProject` (não detectado no código, mas especificado no BRD).  

---  

# Use Case Specification: UC-02 — Obter Projeto Existente

## 1. Characterization
* **Primary Actor:** Desenvolvedor de Linguagens  
* **Secondary Actors:** Sistema (Tauri + Node.js sidecar Express)  
* **Stakeholders & Interests:**  
  * Desenvolvedor de Linguagens – precisa acessar o projeto para edição.  
  * Arquiteto de Sistemas – garante que a leitura não viole limites de quota nem deixe recursos vazados.  
  * Gerente de Produto – interessado na métrica de projetos ativos por usuário.  
* **Trigger:** O usuário seleciona um projeto na lista de projetos recentes ou digita o nome no campo de busca.  
* **Preconditions:**  
  * O projeto solicitado já existe no armazenamento local.  
  * O sidecar Express está disponível.  
* **Postconditions (Success Guarantee):**  
  * Os metadados do projeto (nome, caminho, timestamp de última modificação) são retornados.  
  * O projeto é marcado como “ativo” no cache, permitindo operações subsequentes de arquivo e parsing.  
  * Nenhum erro de acesso é lançado; caso o projeto não exista, um `ProjectError` é retornado.  
* **Scope:** Aplicação desktop Linguistic Isolation.  
* **Level:** User goal.

## 2. Main Scenario (Happy Path)
1. O Desenvolvedor de Linguagens clica no projeto “meu‑projeto” na barra lateral.  
2. O front‑end envia a requisição `getProject` com o ID do projeto via IPC.  
3. O sidecar procura o projeto no armazenamento local.  
4. O sidecar retorna os metadados do projeto e confirma que o projeto está disponível.  
5. O front‑end carrega a estrutura de arquivos do projeto no tree view e abre o arquivo padrão no Monaco Editor.  
6. O caso de uso encerra com sucesso.

## 3. Alternative Scenarios
### AS-1: Usuário digita nome de projeto que não existe e confirma a busca
* **Ponto de extensão:** Passo 2 (envio da requisição).  
* **Passos:**  
  1. O front‑end envia `getProject` com nome inexistente.  
  2. O sidecar não encontra o projeto.  
  3. O sidecar retorna um `ProjectError` com código descritivo (BR‑02).  
  4. O front‑end exibe mensagem “Projeto não encontrado”.  
  5. O usuário pode tentar outro nome ou cancelar.  
* **Retorno ao fluxo principal:** Não; o fluxo termina aqui após a mensagem.

### AS-2: Projeto existe, mas está marcado como “arquivado” (não ativo)
* **Ponto de extensão:** Passo 3 (verificação de estado no sidecar).  
* **Passos:**  
  1. O sidecar verifica que o projeto está arquivado (flag interna).  
  2. O sidecar retorna os metadados juntamente com indicador de arquivamento.  
  3. O front‑end exibe o projeto em cinza e desabilita a edição até que o usuário o “desarquive”.  
* **Retorno ao fluxo principal:** Sim, após exibição o usuário pode escolher desarquivar (fluxo separado).

## 4. Exception Scenarios
### EX-1: Falha de acesso ao disco ao ler metadados do projeto
* **Ponto de extensão:** Passo 3 (leitura do diretório do projeto).  
* **Condição de erro:** O sidecar recebe `FileAccessError`.  
* **Tratamento:**  
  * O sidecar lança `FileAccessError`.  
  * O erro é serializado e enviado ao front‑end (BR‑06, BR‑09).  
  * O front‑end exibe mensagem de erro e sugere verificar o disco ou permissões.  
  * O caso de uso termina com falha.

### EX-2: Corrupção do arquivo de metadados do projeto (JSON inválido)
* **Ponto de extensão:** Passo 3 (desserialização dos metadados).  
* **Condição de erro:** O conteúdo lido não é um JSON válido.  
* **Tratamento:**  
  * O sidecar lança `UpstreamError` (genérico) com detalhe da falha de parsing.  
  * O erro é serializado e enviado ao front‑end (BR‑09).  
  * O front‑end exibe mensagem de erro e oferece opção de excluir o projeto corrupto.  
  * O caso de uso termina com falha.

## 5. Business Rules Envolvidas
* **BR-02:** Ao solicitar um projeto inexistente via `getProject`, o sistema deve retornar um `ProjectError` contendo código de erro descritivo.  
* **BR-06:** Tratamento de `FileAccessError` em operações de leitura/escrita.  
* **BR-09:** Serialização de erros via `serializeError`.

## 6. Non-Functional Requirements Relevantes
* **NFR-P01:** Latência IPC ≤ 200 ms (p95) – garante resposta rápida ao obter projeto.  
* **NFR-P02:** Latência de cache ≤ 100 ms – o projeto é marcado como ativo no cache após obtenção.  
* **NFR-A01:** Disponibilidade ≥ 99 % ao mês – a obtenção deve funcionar continuamente.  
* **NFR-SEC03:** Controle de acesso a arquivos – evita leitura de caminhos fora do diretório de projetos.  
* **NFR-O01:** Logs estruturados – qualquer erro de acesso ou corrupção é registrado para auditoria.

## 7. Frequency of Use
Alta frequência – usado sempre que o desenvolvedor inicia uma sessão de trabalho; esperado dezenas de vezes por dia.

## 8. Assumptions
* O identificador do projeto usado na requisição `getProject` é estável enquanto o projeto não for renomeado ou excluído.  
* O sidecar mantém um índice em memória de projetos para busca rápida (não exige leitura de disco a cada chamada).  
* Não há concorrência que possa excluir o projeto entre a verificação de existência e a leitura dos metadados (o sidecar usa operações atômicas no sistema de arquivos local).

## 9. Open Issues
* Definir política de expiração de projetos inativos no cache (relacionado a BR‑05 e NFR‑P02).  
* Estabelecer mecanismo de “desarquivamento” de projetos e seu impacto nas métricas de uso.

## 10. Related Artifacts
* **User Stories:** US-03 (Obter projeto), US-04 (Tratar projeto inexistente).  
* **User Flow:** Fluxo “Abrir Projeto” em user‑flows.md (não disponível).  
* **API envolvida:** IPC handler `getProject`.  

---  

# Use Case Specification: UC-03 — Salvar Arquivo no Projeto

## 1. Characterization
* **Primary Actor:** Desenvolvedor de Linguagens  
* **Secondary Actors:** Sistema (Tauri + Node.js sidecar Express), Cache de árvores sintáticas (Tree‑sitter)  
* **Stakeholders & Interests:**  
  * Desenvolvedor de Linguagens – deseja persistir alterações de código com baixo atraso.  
  * Arquiteto de Sistemas – garante que gravações respeitem limites de quota e sejam protegidas contra acesso não autorizado.  
  * Gerente de Produto – interessado na taxa de sucesso de operações de save (relacionada à métrica de projetos ativos).  
* **Trigger:** O usuário modifica um arquivo no Monaco Editor e pressiona Ctrl+S ou clica no ícone de salvar.  
* **Preconditions:**  
  * Um projeto está aberto e marcado como ativo no cache.  
  * O arquivo a ser salvo pertence ao projeto aberto.  
  * O sidecar Express está disponível.  
* **Postconditions (Success Guarantee):**  
  * O conteúdo do arquivo é gravado no sistema de arquivos local.  
  * O hash do conteúdo é recalculado e comparado com o hash armazenado (BR‑08) para evitar re‑parsing desnecessário.  
  * Se o hash mudar, a árvore sintática é invalidada no cache; caso contrário, a árvore existente é reutilizada.  
  * Nenhum `FileAccessError` ou `QuotaExceededError` é lançado; caso ocorra, o erro é tratado adequadamente.  
* **Scope:** Aplicação desktop Linguistic Isolation.  
* **Level:** Subfunction (gravar arquivo).

## 2. Main Scenario (Happy Path)
1. O Desenvolvedor de Linguagens edita o arquivo `src/index.js` e pressiona Ctrl+S.  
2. O front‑end captura o conteúdo atual e envia a requisição `saveFile` via IPC, contendo o caminho relativo e o novo conteúdo.  
3. O sidecar calcula o hash do novo conteúdo usando `generateHashKey` (BR‑08).  
4. O sidecar compara o hash com o hash armazenado para aquele arquivo.  
5. Se os hashes diferirem, o sidecar grava o conteúdo no disco e atualiza o hash armazenado.  
6. O sidecar invalida a entrada de árvore sintática no cache para esse arquivo (forçando um novo parse na próxima solicitação).  
7. O sidecar retorna confirmação de gravação.  
8. O front‑end exibe indicador de “salvo” e limpa a marca de sujeição.  
9. O caso de uso encerra com sucesso.

## 3. Alternative Scenarios
### AS-1: Conteúdo não alterado (hash idêntico)
* **Ponto de extensão:** Passo 4 (comparação de hash).  
* **Passos:**  
  1. O sidecar detecta que o hash do novo conteúdo é idêntico ao hash armazenado.  
  2. Nenhuma gravação em disco é realizada; o sidecar retorna imediatamente confirmação de “nenhuma alteração”.  
  3. O front‑end mantém o estado de salvo sem exibir toast redundante.  
* **Retorno ao fluxo principal:** Sim, após confirmação o fluxo termina normalmente.

### AS-2: Usuário escolhe “Salvar Como…” e especifica novo nome de arquivo dentro do projeto
* **Ponto de extensão:** Passo 2 (envio da requisição com caminho diferente).  
* **Passos:**  
  1. O front‑end envia `saveFile` com caminho `src/novo.js`.  
  2. O sidecar verifica se o caminho está dentro do diretório do projeto (validação de entrada – NFR‑SEC03).  
  3. O sidecar cria o arquivo com o novo nome e procede como no fluxo principal.  
  4. O front‑end adiciona o novo arquivo à árvore de projetos.  
* **Retorno ao fluxo principal:** Sim, após gravação o fluxo termina com sucesso.

## 4. Exception Scenarios
### EX-1: Falha ao gravar devido a falta de espaço (quota excedida)
* **Ponto de extensão:** Passo 5 (gravação em disco).  
* **Condição de erro:** O sidecar recebe `QuotaExceededError` ao tentar escrever o arquivo.  
* **Tratamento:**  
  * O sidecar lança `QuotaExceededError`.  
  * O erro é serializado e enviado ao front‑end (BR‑10, BR‑09).  
  * O front‑end exibe mensagem informando que o limite de armazenamento foi atingido e sugere excluir ou arquivar projetos antigos.  
  * Nenhuma alteração é persistida; o caso de uso termina com falha.

### EX-2: Erro de acesso ao arquivo (permissão negada ou arquivo bloqueado)
* **Ponto de extensão:** Passo 5 (tentativa de gravação).  
* **Condição de erro:** O sidecar recebe `FileAccessError`.  
* **Tratamento:**  
  * O sidecar lança `FileAccessError`.  
  * O erro é serializado e enviado ao front‑end (BR‑06, BR‑09).  
  * O front‑end exibe mensagem de erro e sugere fechar outros programas que possam estar bloqueando o arquivo ou verificar permissões.  
  * O caso de uso termina com falha.

### EX-3: Falha ao gerar hash (ex: conteúdo muito grande causando overflow)
* **Ponto de extensão:** Passo 3 (cálculo do hash via `generateHashKey`).  
* **Condição de erro:** O sidecar lança um erro interno (tratado como `UpstreamError`).  
* **Tratamento:**  
  * O erro é serializado e enviado ao front‑end (BR‑09).  
  * O front‑end exibe mensagem genérica de falha ao salvar e oferece tentar novamente com conteúdo menor.  
  * O caso de uso termina com falha.

## 5. Business Rules Envolvidas
* **BR-06:** Tratamento de `FileAccessError` em operações de leitura/escrita.  
* **BR-08:** Gerar hash único do conteúdo via `generateHashKey` e comparar antes de chamar `getOrParseTree`.  
* **BR-09:** Serialização de erros usando `serializeError`.  
* **BR-10:** Respeitar limite de tamanho máximo estabelecido por `setMaxSizeMB`; lançar `QuotaExceededError` ao ultrapassar.

## 6. Non-Functional Requirements Relevantes
* **NFR-P01:** Latência IPC ≤ 200 ms (p95) – garante que o salvar seja percebido como instantâneo.  
* **NFR-P02:** Latência de cache ≤ 100 ms – relevante pois a invalidada ou reutilização da árvore sintática depende do cache.  
* **NFR-P03:** Throughput mínimo de 30 requisições IPC/segundo – suporta múltiplos saves rápidos em sequência.  
* **NFR-A03:** RPO ≤ 0 min – a gravação ocorre antes de retornar sucesso, garantindo persistência imediata.  
* **NFR-SEC03:** Controle de acesso a arquivos e validação de entrada para evitar path traversal – aplicado na verificação do caminho do arquivo.  
* **NFR-CO01:** Custo de infraestrutura próximo de zero – a operação consome apenas CPU/disco da máquina host.  
* **NFR-O02:** Exportação de métricas via `/metrics` – permite monitorar taxa de saves e latência.

## 7. Frequency of Use
Muito alta – esperada dezenas a centenas de vezes por hora por desenvolvedor ativo, conforme padrão de uso de editores de código.

## 8. Assumptions
* O sidecar mantém uma tabela de hash por arquivo para comparação rápida (não requer leitura do disco a cada save).  
* O tamanho máximo de arquivo individual é implícito pelo limite de quota total do projeto (BR‑10).  
* O conteúdo enviado via IPC é serializado como UTF‑8 string; não há compressão automática.

## 9. Open Issues
* Definir política de debounce para saves automáticos (ex: salvar a cada 2 s de inatividade) para reduzir carga de IPC.  
* Estabelecer limite máximo de tamanho de arquivo individual além da quota total, a fim de evitar arquivos gigantes que impactem desempenho de parsing.

## 10. Related Artifacts
* **User Stories:** US-05 (Salvar arquivo), US-06 (Detectar conteúdo unchanged).  
* **User Flow:** Fluxo “Editar e Salvar Arquivo” em user‑flows.md (não disponível).  
* **API envolvida:** IPC handler `saveFile`.  

---  

# Use Case Specification: UC-04 — Detectar Linguagem e Realizar Parsing de Arquivo

## 1. Characterization
* **Primary Actor:** Desenvolvedor de Linguagens  
* **Secondary Actors:** Sistema (Tauri + Node.js sidecar Express), Módulo Tree‑sitter (via `web-tree-sitter` e `tree-sitter-wasms`), Cache de árvores sintáticas  
* **Stakeholders & Interests:**  
  * Desenvolvedor de Linguagens – precisa que o editor reconheça a linguagem correta para destacar sintaxe e oferecer autocompletar.  
  * Arquiteto de Sistemas – garante que a detecção e parsing não consumam recursos excessivos nem deixem vazamentos.  
  * Gerente de Produto – interessado na taxa de acerto da função `languageForFile` (meta ≥ 95 %).  
* **Trigger:** O usuário abre um arquivo no Monaco Editor ou salva uma modificação que pode ter alterado a extensão ou conteúdo.  
* **Preconditions:**  
  * Um projeto está aberto e ativo no cache.  
  * O arquivo a ser analisado existe dentro do diretório do projeto.  
  * O sidecar Express está disponível.  
* **Postconditions (Success Guarantee):**  
  * A linguagem do arquivo é identificada corretamente por `languageForFile`.  
  * Se a linguagem for suportada, a árvore sintática é obtida (do cache ou via novo parsing) e disponibilizada para realce de sintaxe.  
  * Se a linguagem não for suportada, é lançada `LanguageError` ou `LanguageNotFoundError` conforme apropriado (BR‑04).  
  * Nenhum erro de parsing não tratado permanece; eventuais `MCPTreeSitterError` são capturados e convertidos em erro de domínio.  
  * O caso de uso encerra com sucesso ou com erro de domínio bem definido.  
* **Scope:** Aplicação desktop Linguistic Isolation.  
* **Level:** Subfunction (detecção + parsing).

## 2. Main Scenario (Happy Path)
1. O Desenvolvedor de Linguagens abre o arquivo `src/main.rs` no Monaco Editor.  
2. O front‑end envia a requisição `languageForFile` com o caminho relativo do arquivo via IPC.  
3. O sidecar consulta o mapa de extensões ou usa heurística de conteúdo para determinar que a linguagem é Rust.  
4. O sidecar retorna o identificador da linguagem (ex: `"rust"`).  
5. O front‑end solicita o parsing do arquivo enviando `getOrParseTree` com o mesmo caminho.  
6. O sidecar calcula o hash do conteúdo (via `generateHashKey` – BR‑08) e verifica se há uma árvore válida no cache com o mesmo hash.  
7. Como não há entrada em cache (primeiro acesso), o sidecar invoca o parser Tree‑sitter para Rust, produz a árvore sintática e a armazena no cache associada ao hash.  
8. O sidecar retorna a árvore sintática (ou um identificador que o front‑end pode usar para solicitar nós específicos).  
9. O front‑end utiliza a árvore para realce de sintaxe e exibe o arquivo sem erros de parsing.  
10. O caso de uso encerra com sucesso.

## 3. Alternative Scenarios
### AS-1: Linguagem já em cache (hash unchanged)
* **Ponto de extensão:** Passo 6 (verificação de cache após cálculo de hash).  
* **Passos:**  
  1. O sidecar descobre que já existe uma entrada de cache para o mesmo hash.  
  2. A árvore sintática cached é retornada imediatamente, evitando novo parsing.  
  3. O front‑end recebe a árvore e prossegue como no fluxo principal.  
* **Retorno ao fluxo principal:** Sim, após retorno da árvore o fluxo termina normalmente.

### AS-2: Arquivo sem extensão reconhecível, mas conteúdo indica linguagem (ex: shebang)
* **Ponto de extensão:** Passo 3 (detecção de linguagem).  
* **Passos:**  
  1. O sidecar não encontra correspondência na tabela de extensões.  
  2. Lê as primeiras linhas do arquivo e detecta shebang `#!/usr/bin/env python3`.  
  3. Determina a linguagem como Python e retorna o identificador.  
  4. O fluxo continua normalmente para parsing.  
* **Retorno ao fluxo principal:** Sim, após detecção o fluxo prossegue para parsing.

## 4. Exception Scenarios
### EX-1: Linguagem não suportada (nenhuma gramática Tree‑sitter disponível)
* **Ponto de extensão:** Passo 4 (retorno de `languageForFile`).  
* **Condição de erro:** O sidecar não consegue mapear o arquivo para nenhuma linguagem suportada.  
* **Tratamento:**  
  * O sidecar lança `LanguageNotFoundError`.  
  * O erro é serializado e enviado ao front‑end (BR‑04, BR‑09).  
  * O front‑end exibe mensagem informando que a linguagem não é suportada e desativa recursos avançados de sintaxe.  
  * O caso de uso termina com falha de domínio (mas não quebra a aplicação).  

### EX-2: Falha ao invocar o parser Tree‑sitter (ex: WASM não carregado)
* **Ponto de extensão:** Passo 7 (chamada ao parser interno).  
* **Condição de erro:** O sidecar recebe `MCPTreeSitterError` ao tentar criar o parser.  
* **Tratamento:**  
  * O erro é capturado, convertido em `LanguageError` com detalhe da falha de parser.  
  * O erro é serializado e enviado ao front‑end (BR‑04, BR‑09).  
  * O front‑end exibe mensagem de erro de parsing e sugere recarregar a aplicação ou verificar integridade dos arquivos WASM.  
  * O caso de uso termina com falha.  

### EX-3: Arquivo muito grande causando uso excessivo de memória durante parsing
* **Ponto de extensão:** Passo 7 (execução do parser).  
* **Condição de erro:** O consumo de memória ultrapassa o limite interno definido (derivado de NFR‑S03).  
* **Tratamento:**  
  * O sidecar aborta o parsing, lança `LanguageError` com mensagem de “arquivo excede limite de tamanho para parsing”.  
  * O erro é serializado e enviado ao front‑end (BR‑04, BR‑09).  
  * O front‑end exibe mensagem e oferece abrir o arquivo em modo de visualização simples (sem sintaxe).  
  * O caso de uso termina com falha.  

## 5. Business Rules Envolvidas
* **BR-04:** Antes de iniciar o parsing de um arquivo, o sistema deve validar sua linguagem usando `languageForFile`; caso a linguagem não seja suportada, deve lançar `LanguageError` ou `LanguageNotFoundError` conforme apropriado.  
* **BR-08:** Gerar hash único do conteúdo via `generateHashKey` e comparar antes de chamar `getOrParseTree`.  
* **BR-09:** Serialização de erros usando `serializeError`.  

## 6. Non-Functional Requirements Relevantes
* **NFR-P01:** Latência IPC ≤ 200 ms (p95) – garante que detecção e parsing sejam rápidos o suficiente para não travar a UI.  
* **NFR-P02:** Latência de cache ≤ 100 ms – essencial para reutilizar árvores sintáticas já computadas.  
* **NFR-P03:** Throughput mínimo de 30 requisições IPC/segundo – suporta múltiplos arquivos sendo abertos ou salvos em sequência.  
* **NFR-S01:** Suporte a até 50 projetos abertos simultaneamente – relevante pois cada projeto pode ter vários arquivos sendo analisados.  
* **NFR-S03:** Consumo de memória máximo projetado ≤ 300 MB – o cache de árvores sintáticas deve respeitar esse limite.  
* **NFR-SEC03:** Controle de acesso a arquivos e validação de entrada – aplicado na leitura do conteúdo para detecção de linguagem e parsing.  
* **NFR-O03:** Tracing distribuído simples para chamadas IPC críticas (parse, getOrParseTree) – permite medir desempenho dessas operações.  
* **NFR-O04:** Alertas configurados para latência p95 > 250 ms – ajuda a detectar degradação no parsing.  

## 7. Frequency of Use
Alta – ocorre sempre que um arquivo é aberto, salvo ou quando o usuário muda de aba; esperado dezenas de vezes por minuto por desenvolvedor ativo.

## 8. Assumptions
* O mapa de extensões para linguagens é mantido atualizado no sidecar e inclui todas as linguagens para as quais gramáticas Tree‑sitter estão disponíveis em tempo de compilação ou são baixadas sob demanda.  
* O hash usado para cache de árvores sintáticas é suficientemente forte para evitar colisões práticas (ex: SHA‑256 truncado).  
* O sidecar pode carregar gramáticas Tree‑sitter sob demanda sem reiniciar o processo (via `web-tree-sitter`).  

## 9. Open Issues
* Definir política de evicção de árvores sintáticas do cache quando o limite de memória (NFR‑S03) for atingido (relacionado a BR‑05).  
* Estabelecer mecanismo de fallback para linguagem desconhecida (ex: tratar como texto simples) em vez de lançar erro, a fim de melhorar experiência do usuário.  

## 10. Related Artifacts
* **User Stories:** US-07 (Detectar linguagem), US-08 (Obter árvore sintática).  
* **User Flow:** Fluxo “Abrir Arquivo e Realçar Sintaxe” em user‑flows.md (não disponível).  
* **API envolvida:** IPC handlers `languageForFile` e `getOrParseTree`.  

---  

# Use Case Specification: UC-05 — Gerenciar Cache e Limites de Armazenamento (Quota)

## 1. Characterization
* **Primary Actor:** Arquiteto de Sistemas (operação administrativa) / Sistema (execução automática)  
* **Secondary Actors:** Sistema (Tauri + Node.js sidecar Express), Módulo de cache, Sistema de arquivos local  
* **Stakeholders & Interests:**  
  * Arquiteto de Sistemas – deseja garantir que o uso de disco e memória permaneça dentro dos limites definidos, evitando `QuotaExceededError` e vazamentos de memória.  
  * Desenvolvedor de Linguagens – se beneficia de um ambiente estável onde operações não falham inesperadamente por falta de espaço.  
  * Gerente de Produto – interessado na métrica de projetos que acionam `QuotaExceededError` (meta ≤ 1 %).  
* **Trigger:** O sistema verifica periodicamente (a cada minuto ou após operações de gravação) se o uso de cache ou de armazenamento ultrapassou os limites configurados via `setTTLSeconds`, `evictIfNeeded` ou `setMaxSizeMB`.  
* **Preconditions:**  
  * O sidecar Express está em execução.  
  * O módulo de cache foi inicializado e possui funções `getMemoryStats`, `setTTLSeconds`, `evictIfNeeded`.  
  * O limite de tamanho máximo de armazenamento foi definido previamente por `setMaxSizeMB` (BR‑10).  
* **Postconditions (Success Guarantee):**  
  * Se o uso de memória do cache estiver acima do TTL configurado, entradas expiradas são removidas via `evictIfNeeded`.  
  * Se o uso total de armazenamento de projetos exceder o limite definido por `setMaxSizeMB`, o sistema lança `QuotaExceededError` para a operação que tentou gravar além do limite e impede a gravação.  
  * Nenhum recurso fica alocado indevidamente; toda memória liberada é devolvida ao SO.  
  * O caso de uso encerra com sucesso (limites respeitados) ou com erro de quota bem definido.  
* **Scope:** Aplicação desktop Linguistic Isolation (camada de cache e controle de quota).  
* **Level:** Subfunction (gerenciamento de recursos).

## 2. Main Scenario (Happy Path – Verificação de TTL e Evicção)
1. O sidecar executa a tarefa periódica de manutenção do cache (disparada por `setInterval` interno).  
2. O sidecar chama `getMemoryStats` para obter o uso atual de memória do cache.  
3. Compara o uso com o TTL definido anteriormente por `setTTLSeconds`.  
4. Se houver entradas cujo tempo de vida excedeu o TTL, o sidecar invoca `evictIfNeeded` para removê‑las do cache.  
5. O sidecar atualiza as estatísticas e registra no log estruturado a quantidade de entradas evicted (NFR‑O01).  
6. Nenhum erro é levantado; o caso de uso encerra com sucesso.

## 3. Main Scenario (Happy Path – Verificação de Quota de Armazenamento)
1. Após uma operação de `saveFile` que grava novos dados no disco, o sidecar chama uma função interna que calcula o tamanho total do diretório de projetos.  
2. Compara esse tamanho com o limite estabelecido por `setMaxSizeMB` (BR‑10).  
3. Se o tamanho estiver abaixo do limite, a operação de gravação prossegue normalmente.  
4. Se o tamanho ultrapassar o limite, o sidecar interrompe a gravação, lança `QuotaExceededError` e retorna o erro ao front‑end (BR‑10, BR‑09).  
5. O front‑end exibe mensagem informando o excesso de quota e sugere excluir ou arquivar projetos antigos.  
6. O caso de uso termina com falha de quota (mas a aplicação permanece operacional).

## 4. Alternative Scenarios
### AS-1: Usuário reduz o limite de quota manualmente enquanto há projetos próximos ao limite
* **Ponto de extensão:** Antes da verificação de quota (passo 2 do fluxo de gravação).  
* **Passos:**  
  1. O Arquiteto de Sistemas executa comando via interface de administração que chama `setMaxSizeMB` com um novo valor menor.  
  2. O sidecar atualiza o limite interno.  
  3. Na próxima operação de gravação, a verificação de quota usa o novo limite.  
  4. Se o uso atual já estiver acima do novo limite, o sidecar lança imediatamente `QuotaExceededError` para a operação em curso.  
* **Retorno ao fluxo principal:** Não; o fluxo de gravação termina com erro de quota.

### AS-2: Cache está vazio após evicção total (ex: após limpeza manual)
* **Ponto de extensão:** Após chamada a `evictIfNeeded` (passo 4 do fluxo de TTL).  
* **Passos:**  
  1. O sidecar verifica que `getMemoryStats` retorna zero de uso.  
  2. Nenhuma ação adicional é necessária; o sidecar apenas registra o evento no log.  
  3. O caso de uso encerra com sucesso.  

## 5. Exception Scenarios
### EX-1: Falha ao obter estatísticas de memória do cache (função `getMemoryStats` indisponível)
* **Ponto de extensão:** Passo 2 do fluxo de TTL.  
* **Condição de erro:** O sidecar recebe exceção ao chamar `getMemoryStats`.  
* **Tratamento:**  
  * O erro é tratado como `UpstreamError`, serializado e enviado ao front‑end (BR‑09).  
  * O front‑end exibe mensagem de erro de sistema e registra o incidente no log estruturado (NFR‑O01).  
  * O sidecar tenta novamente após um breve back‑off; se persistir, o caso de uso termina com falha de monitoramento (mas não afeta operações de usuário diretamente).  

### EX-2: Erro ao calcular tamanho total do diretório de projetos (ex: permissão negada em subpasta)
* **Ponto de extensão:** Passo 2 do fluxo de quota (cálculo de tamanho).  
* **Condição de erro:** O sidecar recebe `FileAccessError` ao percorrer o diretório.  
* **Tratamento:**  
  * O erro é serializado e enviado ao front‑end (BR‑06, BR‑09).  
  * O front‑end exibe mensagem indicando que não foi possível verificar o uso de armazenamento e sugere verificar permissões da pasta de projetos.  
  * O caso de uso termina com falha de verificação de quota (a gravação pode ainda ocorrer, mas o risco de ultrapassar limite aumenta).  

## 6. Business Rules Envolvidas
* **BR-05:** O cache deve ser invalidado automaticamente quando o TTL definido por `setTTLSeconds` expirar ou quando `evictIfNeeded` for acionado, garantindo que dados obsoletos não sejam utilizados.  
* **BR-06:** Tratamento de `FileAccessError` em operações de leitura/escrita.  
* **BR-09:** Serialização de erros usando `serializeError`.  
* **BR-10:** Respeitar o limite de tamanho máximo estabelecido por `setMaxSizeMB`; lançar `QuotaExceededError` ao ultrapassar.  

## 7. Non-Functional Requirements Relevantes
* **NFR-P02:** Latência de cache ≤ 100 ms – relevante pois as operações de `getMemoryStats`, `setTTLSeconds` e `evictIfNeeded` devem ser rápidas para não bloquear o ciclo de manutenção.  
* **NFR-P03:** Throughput mínimo de 30 requisições IPC/segundo – suporta verificações frequentes de cache e quota sem degradação.  
* **NFR-S03:** Consumo de memória máximo projetado ≤ 300 MB – o cache deve permanecer dentro desse limite; a evicção garante conformidade.  
* **NFR-A03:** RPO ≤ 0 min – qualquer mudança no uso de disco é refletida imediatamente antes de permitir novas gravações.  
* **NFR-SEC03:** Controle de acesso a arquivos e validação de entrada – aplicado na leitura do tamanho do diretório e na evicção de arquivos de cache.  
* **NFR-O01:** Logs estruturados – operações de evicção e verificações de quota são registradas para auditoria e alertas.  
* **NFR-O04:** Alertas configurados para uso de memória > 80 % do limite configurado – dispara quando o cache se aproxima do limite de 300 MB.  
* **NFR-CO01:** Custo de infraestrutura próximo de zero – a operação de gerenciamento consome apenas CPU/disco da máquina host.  

## 8. Frequency of Use
Média‑alta – a verificação de TTL ocorre a cada minuto (configurável) e a verificação de quota ocorre a cada operação de gravação; em uso típico, dezenas de verificações por minuto por instância.

## 9. Assumptions
* O sidecar mantém um contador interno de bytes gravados que é atualizado de forma incremental, evitando varredura completa do diretório a cada verificação de quota (exceto quando o contador é suspeito de estar desatualizado).  
* O TTL do cache é definido em segundos e aplicado uniformemente a todas as entradas; não há TTL por tipo de dado.  
* O limite de quota (`setMaxSizeMB`) é definido uma vez na inicialização da aplicação e pode ser alterado apenas por usuário com privilégios de administrador (Arquiteto de Sistemas).  

## 10. Open Issues
* Definir política de notificação proativa ao usuário quando o uso de armazenamento atingir 80 % do limite, a fim de evitar surpresa com `QuotaExceededError`.  
* Estabelecer mecanismo de compactação ou arquivamento automático de projetos antigos quando o limite for próximo de ser atingido.  
* Avaliar a necessidade de TTL diferenciado por tipo de dado (ex: árvores sintáticas vs. metadados de projeto) para otimizar uso de memória.  

## 10. Related Artifacts
* **User Stories:** US-09 (Gerenciar TTL do cache), US-10 (Verificar e aplicar quota de armazenamento).  
* **User Flow:** Fluxo “Manutenção de Recursos” em user‑flows.md (não disponível).  
* **API envolvida:** IPC handlers internos (não expostos diretamente ao front‑end) para `setTTLSeconds`, `evictIfNeeded`, `getMemoryStats`, `setMaxSizeMB`.  

---  

*Fim do documento de Use Cases.*