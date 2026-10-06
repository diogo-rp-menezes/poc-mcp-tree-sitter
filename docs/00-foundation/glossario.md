# Glossário & Ubiquitous Language — 4

> Documento gerado automaticamente pelo pipeline determinístico de análise de código
> (server/glossary-pipeline.ts). Termos extraídos via AST + schema real (server/db.ts) + rotas
> reais (server/express-app.ts); definições geradas por IA a partir de uso real no código —
> revise as linhas marcadas com ⚠️.

## 1. Termos de Domínio
| Termo | Definição | Contexto/Bounded Context | Sinônimos observados |
| :--- | :--- | :--- | :--- |
| auditIsolation | Process of verifying that data, systems, or resources are correctly isolated to maintain security, privacy, and regulatory compliance. | engine-dist | isolation audit, segregation verification, audit of isolation |
| CacheError | Ocorre quando o sistema não consegue ler ou gravar dados no cache, afetando a performance ou a consistência das informações. | src | Falha de cache, Erro de armazenamento em cache, Problema de cache |
| cloneProject | Cria uma cópia completa de um projeto existente, incluindo todos os seus arquivos, sob um novo nome. | engine-dist | duplicar projeto, copiar projeto, replicar projeto |
| createProject | Inicia um novo projeto dentro do sistema, definindo seus parâmetros iniciais. | engine-dist | iniciarProjeto, criarNovoProjeto, abrirProjeto |
| delete | A ação de remover permanentemente um registro ou objeto do sistema. | engine-dist | excluir, remover, apagar |
| deleteEntry | Remove um registro existente do armazenamento de dados. | engine-dist | removerEntrada, excluirRegistro, apagarEntrada |
| deleteFile | Exclui um arquivo armazenado no banco de dados, liberando o espaço ocupado. Esta operação é utilizada quando o arquivo não é mais necessário para o funcionamento do sistema. | engine-dist | excluirArquivo, removerArquivo, apagarArquivo |
| dispose | O ato de liberar ou encerrar o uso de recursos que não são mais necessários, garantindo que o sistema permaneça eficiente e livre de vazamentos. | src | liberar, encerrar, finalizar, desalocar |
| errorMessage | Mensagem que descreve de forma legível o problema que ocorreu durante a execução do sistema. | src | mensagem de erro, texto de erro, descrição do erro |
| evictIfNeeded | Garante que o cache seja limpo automaticamente, removendo dados desatualizados somente quando for preciso. | engine-dist | limpar se necessário, remover se obsoleto, purga condicional |
| FileAccessError | Ocorre quando o sistema não consegue ler ou gravar um arquivo necessário para executar uma operação. Indica que o arquivo pode estar ausente, bloqueado ou com permissões insuficientes. | src | Erro de acesso a arquivo, Falha ao acessar arquivo, Problema de leitura/escrita de arquivo |
| findNodeAtPosition | Identifica qual parte do documento (como um trecho de código ou texto) está localizado em uma determinada posição indicada por linha e coluna. Essa informação é usada para determinar qual nó da árvore sintática abrange o ponto solicitado. | src | localizar nó na posição, buscar nó por coordenada, encontrar elemento na posição |
| generateHashKey | Cria um identificador único (hash) que representa o conteúdo do código-fonte e da gramática, permitindo verificar se houve alterações. | engine-dist | gerarHash, calcularDigest, produzirImpressãoDigital, gerarFingerprint |
| getFile | Recupera um arquivo solicitado pelo usuário a partir do armazenamento do sistema. | engine-dist | obter arquivo, recuperar arquivo, buscar arquivo |
| getIncludedRanges | Recupera os intervalos que estão incluídos em um determinado conjunto ou seleção. | engine-dist | obter intervalos incluídos, listar faixas incluídas, recuperar intervalos selecionados |
| getLanguage | Obtém a configuração de idioma utilizada pelo mecanismo de análise para interpretar o código-fonte. | engine-dist | obter idioma, recuperar linguagem, fetch language |
| getMemoryStats | Fornece as contagens de uso de memória do sistema que são utilizadas como métricas de monitoramento de desempenho. | engine-dist | estatísticas de memória, métricas de uso de memória, contagem de memória |
| getOrParseTree | Obtém a árvore de sintaxe do código fonte a partir do cache, caso ela já exista, ou a gera fazendo a análise e a armazena para uso futuro. Esse mecanismo evita reanálises desnecessárias, melhorando o desempenho. | engine-dist | obter árvore, criar árvore, buscar ou gerar árvore |
| getProject | Recuperar os detalhes de um projeto cadastrado no sistema. | engine-dist | obter projeto, consultar projeto, recuperar projeto |
| getProjectFileStats | Obtém informações resumidas sobre os arquivos de um projeto, como quantidade, tamanho e tipos. | engine-dist | obter estatísticas de arquivos do projeto, consultar métricas de arquivos do projeto, recuperar resumo de arquivos do projeto |
| getProjectOverview | Obtém um resumo das informações principais de um projeto, como status, datas e responsáveis. | engine-dist | obterVisãoGeralDoProjeto, consultarResumoDoProjeto, recuperarVisãoDoProjeto |
| getStats | Obtém as métricas e indicadores de desempenho do sistema, permitindo acompanhar seu comportamento e eficiência. | engine-dist | obter estatísticas, consultar métricas, recuperar indicadores |
| handleWorkerDeath | Processo que trata a ocorrência de falha ou término inesperado de um trabalhador no sistema, garantindo a continuidade das operações. | engine-dist | tratamento da morte do trabalhador, gerenciamento de falha de trabalhador, resposta à perda de trabalhador |
| initialize | Iniciar ou preparar um componente para que esteja pronto para ser utilizado. | engine-dist | iniciar, configurar, preparar, dar início |
| invalidate | Invalidar significa tornar algo sem efeito ou não válido, removendo sua validade ou autorização. É utilizado quando se deseja cancelar ou anular uma decisão, contrato ou registro previamente aprovado. | engine-dist | anular, cancelar, revogar, desconsiderar, nulificar |
| isEnabled | Indica se um recurso ou funcionalidade está disponível para uso no sistema. | engine-dist | ativado, habilitado, ligado, ativo |
| LanguageError | Ocorre quando o sistema encontra um idioma não suportado ou inválido durante o processamento de uma solicitação. Indica que a linguagem informada não pode ser processada, exigindo correção antes de continuar. | src | Erro de idioma, Falha de idioma, Erro de linguagem |
| languageForFile | Identifica a linguagem de programação associada a um arquivo com base em seu caminho ou extensão. | engine-dist | determina linguagem do arquivo, mapeia extensão para linguagem, identifica gramática da linguagem |
| LanguageInstallError | Ocorre quando o sistema não consegue instalar um novo idioma, indicando um problema no processo de instalação. Esse erro impede que o usuário utilize o idioma desejado até que a causa seja resolvida. | src | Erro de Instalação de Idioma, Falha na Instalação de Idioma, Erro ao Instalar Idioma |
| LanguageNotFoundError | Indica que o sistema tentou utilizar um idioma que não está disponível ou não foi encontrado nos recursos de localização. | src | Erro de idioma não encontrado, Erro de idioma ausente |
| listFiles | Obter a lista de arquivos disponíveis em um diretório ou repositório para consulta ou processamento. | engine-dist | listar arquivos, obter lista de arquivos, enumerar arquivos |
| listLanguages | Lista os idiomas disponíveis em um projeto ou em todo o sistema, permitindo identificar quais linguagens estão sendo utilizadas. | engine-dist | listar idiomas, obter linguagens, consultar idiomas |
| listProjects | Obter a lista de projetos disponíveis no sistema. | engine-dist | listar projetos, obter lista de projetos, consultar projetos |
| MCPTreeSitterError | Indica que ocorreu um problema ao interpretar a estrutura do código-fonte durante o processamento do MCP. Esse erro impede que o sistema continue a analisar ou executar o código afetado. | src | Erro de árvore sintática, Erro de parsing Tree-sitter, Falha de análise sintática |
| parse | O ato de interpretar e converter informações recebidas em um formato estruturado que possa ser utilizado pelos processos de negócio. Essa transformação permite que os dados sejam consumidos de forma confiável em aplicações e relatórios. | engine-dist | interpretar, analisar, decodificar, traduzir |
| ParsingError | Ocorre quando o sistema não consegue interpretar corretamente os dados fornecidos, como arquivos em formato inválido ou informações incompletas, impedindo o processamento normal da solicitação. | src | Falha na interpretação de dados, Erro de formato de entrada, Problema no processamento de solicitação |
| pick | Selecionar um recurso ou item disponível para ser utilizado em uma operação ou fluxo de trabalho. Essa escolha é feita com base em critérios de disponibilidade ou prioridade. | engine-dist | selecionar, escolher, extrair |
| ProjectConflictError | Ocorre quando há um conflito ao tentar criar ou atualizar um projeto, como nome duplicado ou estado incompatível. | src | Conflito de projeto, Erro de conflito de projeto, Project conflict |
| ProjectError | Representa um problema ou falha que ocorre durante a execução de um projeto, indicando que algo não saiu conforme o planejado. | src | Erro de projeto, Falha de projeto, Problema de projeto |
| put | Ação de inserir ou atualizar um registro no sistema, garantindo que os dados estejam disponíveis para uso posterior. | engine-dist | inserir, armazenar, atualizar, gravar |
| QueryError | Ocorre quando uma solicitação para obter dados não pode ser concluída com sucesso. | src | Erro de consulta, Falha na consulta, Erro de busca |
| QuotaExceededError | Indica que o limite de armazenamento permitido foi ultrapassado, impedindo a inclusão de novos dados no sistema. Ocorre quando o volume de dados excede a quota configurada, gerando um erro HTTP 413. | src | Erro de quota excedida, Limite de armazenamento excedido, Erro 413 de payload too large |
| removeProject | Excluir um projeto do portfólio de trabalhos, liberando seus recursos e removendo-o das listas ativas. | engine-dist | excluir projeto, deletar projeto, remover projeto |
| reset | O reset consiste em restaurar o estado inicial de um componente ou sistema, descartando alterações temporárias e preparando-o para uma nova execução. É utilizado para garantir consistência e evitar propagação de erros entre operações sucessivas. | engine-dist | redefinir, reinicializar, zerar, limpar |
| resolveFileLanguageOrThrow | Identifica a linguagem de um arquivo com base em seu caminho, lançando um erro caso a linguagem não seja reconhecida ou suportada. | engine-dist | determinaLinguagemArquivo, identificaLinguagemDoArquivo, obtemLinguagemDoArquivo |
| resolveLanguageOrThrow | Identifica o idioma de um conteúdo, assegurando que somente idiomas suportados sejam processados; caso o idioma não esteja disponível, gera um erro para interromper o fluxo. | engine-dist | determinar idioma, identificar idioma, consultar idioma, obter idioma |
| saveFile | Operação que persiste ou atualiza um arquivo no repositório de dados do sistema, garantindo que ele esteja disponível para consulta futura. | engine-dist | salvar arquivo, atualizar arquivo, gravar arquivo |
| saveFilesBatch | Processo de salvar vários arquivos de forma agrupada em uma única transação para garantir eficiência e consistência. | engine-dist | salvar arquivos em lote, gravação em lote de arquivos, batch file save |
| SecurityError | Ocorre quando uma operação tenta acessar recursos ou executar ações que violam as políticas de segurança do sistema. Indica que o acesso foi bloqueado por motivos de proteção de dados ou integridade. | src | Erro de segurança, Falha de segurança, Exceção de segurança |
| serializeError | Processo de converter um objeto de erro em uma representação simples (como texto ou JSON) para que possa ser registrado ou enviado a outros sistemas. | src | serializar erro, converter erro, formatar erro |
| setEnabled | Indica se um componente ou serviço deve estar operacional ou suspenso no sistema. Permite controlar o acesso ou a disponibilidade de funcionalidades conforme regras de negócio. | engine-dist | ativar, desativar, habilitar, desabilitar, ligar, desligar |
| setMaxSizeMB | Define o limite máximo de tamanho, em megabytes, que um recurso pode ocupar. Esse limite controla o uso de armazenamento ou memória alocado para o componente. | engine-dist | defineTamanhoMáximoMB, configurarLimiteTamanhoMB, estabelecerTamanhoLimiteMB |
| setTTLSeconds | Define por quanto tempo os dados armazenados em cache permanecem válidos antes de serem atualizados ou removidos. | engine-dist | definir TTL, configurar tempo de vida, ajustar expiração do cache, estabelecer duração de validade |
| shouldUse | Indica se determinado recurso ou funcionalidade deve ser empregado em um dado contexto. | engine-dist | deveSerUtilizado, deveSerAplicado, precisaSerUsado |
| shutdown | O ato de encerrar de forma ordenada as operações de um sistema ou serviço, liberando recursos e finalizando atividades em curso. | engine-dist | encerramento, desligamento, finalização, parada |
| spawn | O termo 'spawn' refere-se à ação de iniciar ou criar uma nova instância de um processo ou serviço dentro do sistema. | engine-dist | iniciar, criar, gerar, lançar |
| toJSON | Processo de transformar um objeto interno em uma representação JSON, permitindo sua transmissão ou armazenamento em formato padronizado. Essa operação facilita a integração entre sistemas ao padronizar os dados em texto legível por máquinas. | engine-dist | serializar para JSON, converter para JSON, exportar como JSON |
| updateProject | Atualiza as informações de um projeto existente, como nome, caminho e descrição, assegurando que as mudanças sejam aplicadas de forma consistente em todos os arquivos relacionados. | engine-dist | atualizar projeto, modificar projeto, editar projeto |
| UpstreamError | Erro que ocorre quando um serviço externo (upstream) não responde corretamente, como quando o limite de requisições da API do GitHub é excedido ou o serviço está indisponível. | src | Falha de upstream, Erro de serviço externo, Erro de dependência |
| walk | O ato de percorrer ou visitar cada elemento de uma coleção ou estrutura de dados de forma sequencial, aplicando uma operação em cada item encontrado. | engine-dist | traverse, iterate, navigate, explore |

## 2. Acrônimos & Siglas
| Sigla | Significado | Definição |
| :--- | :--- | :--- |
| — | — | Nenhum acrônimo/sigla identificado deterministicamente nos termos extraídos. |

## 3. Entidades de Domínio (Core Entities)
| Entidade | Descrição | Atributos-chave | Relacionamentos |
| :--- | :--- | :--- | :--- |
| LanguageError | Ocorre quando o sistema encontra um idioma não suportado ou inválido durante o processamento de uma solicitação. Indica que a linguagem informada não pode ser processada, exigindo correção antes de continuar. | (ver atributos no código-fonte) | (ver relacionamentos no código-fonte) |
| LanguageNotFoundError | Indica que o sistema tentou utilizar um idioma que não está disponível ou não foi encontrado nos recursos de localização. | (ver atributos no código-fonte) | (ver relacionamentos no código-fonte) |
| MCPTreeSitterError | Indica que ocorreu um problema ao interpretar a estrutura do código-fonte durante o processamento do MCP. Esse erro impede que o sistema continue a analisar ou executar o código afetado. | (ver atributos no código-fonte) | (ver relacionamentos no código-fonte) |
| ProjectError | Representa um problema ou falha que ocorre durante a execução de um projeto, indicando que algo não saiu conforme o planejado. | (ver atributos no código-fonte) | (ver relacionamentos no código-fonte) |

## 4. Estados & Ciclos de Vida
| Entidade | Estados possíveis | Observação |
| :--- | :--- | :--- |
| — | — | Estados/ciclos de vida NÃO são extraídos deterministicamente pelo pipeline — preencher manualmente ou consultar o artefato state-machines.md. |

## 5. Papéis & Atores
| Papel | Descrição | Permissões típicas |
| :--- | :--- | :--- |
| — | — | Nenhum papel/ator classificado nos termos extraídos. |

## 6. Regras de Nomenclatura
* Nomes de variáveis, funções e tabelas em inglês no código; comentários e documentação em português.
* Evitar termos genéricos como "dados", "item" ou "info" — sempre nomear a entidade específica do domínio.
* Quando um termo possuir sinônimos (ver Seção 1), usar sempre a forma canônica (coluna "Termo") em código e documentação.

## 7. Termos Depreciados
| Termo Antigo | Substituído por | Motivo | Data da mudança |
| :--- | :--- | :--- | :--- |
| isolation audit, segregation verification, audit of isolation | auditIsolation | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| Falha de cache, Erro de armazenamento em cache, Problema de cache | CacheError | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| duplicar projeto, copiar projeto, replicar projeto | cloneProject | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| iniciarProjeto, criarNovoProjeto, abrirProjeto | createProject | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| excluir, remover, apagar | delete | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| removerEntrada, excluirRegistro, apagarEntrada | deleteEntry | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| excluirArquivo, removerArquivo, apagarArquivo | deleteFile | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| liberar, encerrar, finalizar, desalocar | dispose | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| mensagem de erro, texto de erro, descrição do erro | errorMessage | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| limpar se necessário, remover se obsoleto, purga condicional | evictIfNeeded | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| Erro de acesso a arquivo, Falha ao acessar arquivo, Problema de leitura/escrita de arquivo | FileAccessError | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| localizar nó na posição, buscar nó por coordenada, encontrar elemento na posição | findNodeAtPosition | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| gerarHash, calcularDigest, produzirImpressãoDigital, gerarFingerprint | generateHashKey | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| obter arquivo, recuperar arquivo, buscar arquivo | getFile | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| obter intervalos incluídos, listar faixas incluídas, recuperar intervalos selecionados | getIncludedRanges | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| obter idioma, recuperar linguagem, fetch language | getLanguage | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| estatísticas de memória, métricas de uso de memória, contagem de memória | getMemoryStats | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| obter árvore, criar árvore, buscar ou gerar árvore | getOrParseTree | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| obter projeto, consultar projeto, recuperar projeto | getProject | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| obter estatísticas de arquivos do projeto, consultar métricas de arquivos do projeto, recuperar resumo de arquivos do projeto | getProjectFileStats | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| obterVisãoGeralDoProjeto, consultarResumoDoProjeto, recuperarVisãoDoProjeto | getProjectOverview | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| obter estatísticas, consultar métricas, recuperar indicadores | getStats | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| tratamento da morte do trabalhador, gerenciamento de falha de trabalhador, resposta à perda de trabalhador | handleWorkerDeath | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| iniciar, configurar, preparar, dar início | initialize | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| anular, cancelar, revogar, desconsiderar, nulificar | invalidate | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| ativado, habilitado, ligado, ativo | isEnabled | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| Erro de idioma, Falha de idioma, Erro de linguagem | LanguageError | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| determina linguagem do arquivo, mapeia extensão para linguagem, identifica gramática da linguagem | languageForFile | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| Erro de Instalação de Idioma, Falha na Instalação de Idioma, Erro ao Instalar Idioma | LanguageInstallError | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| Erro de idioma não encontrado, Erro de idioma ausente | LanguageNotFoundError | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| listar arquivos, obter lista de arquivos, enumerar arquivos | listFiles | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| listar idiomas, obter linguagens, consultar idiomas | listLanguages | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| listar projetos, obter lista de projetos, consultar projetos | listProjects | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| Erro de árvore sintática, Erro de parsing Tree-sitter, Falha de análise sintática | MCPTreeSitterError | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| interpretar, analisar, decodificar, traduzir | parse | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| Falha na interpretação de dados, Erro de formato de entrada, Problema no processamento de solicitação | ParsingError | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| selecionar, escolher, extrair | pick | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| Conflito de projeto, Erro de conflito de projeto, Project conflict | ProjectConflictError | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| Erro de projeto, Falha de projeto, Problema de projeto | ProjectError | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| inserir, armazenar, atualizar, gravar | put | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| Erro de consulta, Falha na consulta, Erro de busca | QueryError | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| Erro de quota excedida, Limite de armazenamento excedido, Erro 413 de payload too large | QuotaExceededError | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| excluir projeto, deletar projeto, remover projeto | removeProject | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| redefinir, reinicializar, zerar, limpar | reset | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| determinaLinguagemArquivo, identificaLinguagemDoArquivo, obtemLinguagemDoArquivo | resolveFileLanguageOrThrow | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| determinar idioma, identificar idioma, consultar idioma, obter idioma | resolveLanguageOrThrow | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| salvar arquivo, atualizar arquivo, gravar arquivo | saveFile | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| salvar arquivos em lote, gravação em lote de arquivos, batch file save | saveFilesBatch | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| Erro de segurança, Falha de segurança, Exceção de segurança | SecurityError | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| serializar erro, converter erro, formatar erro | serializeError | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| ativar, desativar, habilitar, desabilitar, ligar, desligar | setEnabled | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| defineTamanhoMáximoMB, configurarLimiteTamanhoMB, estabelecerTamanhoLimiteMB | setMaxSizeMB | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| definir TTL, configurar tempo de vida, ajustar expiração do cache, estabelecer duração de validade | setTTLSeconds | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| deveSerUtilizado, deveSerAplicado, precisaSerUsado | shouldUse | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| encerramento, desligamento, finalização, parada | shutdown | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| iniciar, criar, gerar, lançar | spawn | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| serializar para JSON, converter para JSON, exportar como JSON | toJSON | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| atualizar projeto, modificar projeto, editar projeto | updateProject | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| Falha de upstream, Erro de serviço externo, Erro de dependência | UpstreamError | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |
| traverse, iterate, navigate, explore | walk | Variante(s) consolidada(s) sob a forma canônica durante a dedup do pipeline. | (data da regeneração) |

## 8. Referências Externas
* [ENTRADA HUMANA NECESSÁRIA — não gerado a partir do código] Listar aqui glossários de indústria, normas regulatórias ou fontes externas que definem os termos usados neste projeto.
