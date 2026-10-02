# O que o parlamentar fez

SPA client-side para consulta pública, exploração histórica e conferência factual de proposições e votações nominais do Congresso Nacional (Câmara dos Deputados e Senado Federal). Tudo opera diretamente no navegador: sem servidores intermediários, sem banco de dados, sem login e sem rastreadores.

*O que o parlamentar fez* é a aplicação web de consulta pública do repositório `legislative-activity-explorer`.

## Funcionamento

- **Busca Unificada Oficial**: Pesquisa direta e simultânea na Câmara dos Deputados e no Senado Federal por nome de parlamentar ou identificador de proposição (ex.: `PL 1234/2023`, `PEC 45/2019`).
- **Navegação Guiada**: Interface conversacional estruturada baseada em cartões e botões contextuais, sem texto livre ou ambiguidades.
- **Perfil do Parlamentar**: Consulta a dados biográficos oficiais, exercício de mandato, estado, partido, foto oficial e acesso direto a proposições de sua autoria e votações associadas.
- **Detalhamento de Proposições**: Ementa oficial completa, autoria, relatoria, temas e tramitação, distinguindo estritamente o texto legal de resumos factuais verificados.
- **Painel de Votações Nominais**: Exibição detalhada de contagens oficiais (SIM, NÃO, ABSTENÇÃO, OBSTRUÇÃO e OUTROS), detalhamento nominal com busca/filtro e histórico por parlamentar.
- **Acesso Direto via URL**: Sincronização com rotas e parâmetros na URL para compartilhamento direto de buscas, perfis de parlamentares e proposições legislativas.
- **Cache em Memória e Resiliência**: Cache de respostas HTTP em memória para evitar requisições repetidas e garantir navegação fluida.
- **Proxy CORS Integrado**: Roteamento por Cloudflare Worker para contornar restrições de CORS e aplicar cache de borda nas requisições às APIs públicas.

## Premissas e Neutralidade

- **Neutralidade Institucional Absoluta**: Sem ranqueamentos políticos, notas ideológicas ("esquerda", "direita", "centro") ou juízos de valor sobre o mérito das proposições. A aplicação apresenta exclusivamente os registros públicos oficiais.
- **Fidelidade Factual e Fontes Oficiais**: O aplicativo exibe estritamente as ementas e tramitações oficiais dos órgãos públicos ou resumos factuais verificados a partir de catálogo auditado (`factualSummaryCatalog.ts`), garantindo determinismo e reprodutibilidade sem sínteses dinâmicas ou interpretações de terceiros.
- **Privacidade Estrita**: Sem cookies analíticos, telemetria, pixels de monitoramento, contas de usuário ou persistência de buscas em servidores externos. As consultas permanecem na memória do dispositivo.
- **Semântica Visual Isenta e Acessível**: Padrões visuais neutros e de alto contraste, sem códigos de cor valorativos (como verde para "favorável" e vermelho para "contrário"), respeitando a neutralidade da informação e conformidade com acessibilidade (WCAG).

## Stack Tecnológica

- **SvelteKit 2 & Svelte 5**: SPA estática compilada via `@sveltejs/adapter-static`, reatividade com Runes e navegação veloz no cliente.
- **TypeScript 5**: Tipagem estrita de contratos de domínio, payloads das APIs da Câmara e do Senado e mappers de dados.
- **Tailwind CSS 4**: Estilização utilitária de alta densidade focada em acessibilidade, contraste e responsividade móvel.
- **Vitest 3**: Suíte abrangente de testes automatizados com mocks de rede injetados e execução determinística.
- **Playwright**: Testes de ponta a ponta (E2E) cobrindo fluxos conversacionais e integridade da interface.
- **Cloudflare Pages & Workers**: Hospedagem estática serverless e Worker para proxy CORS e cache de borda.

## Comandos

```bash
npm install        # instala as dependências
npm run dev        # servidor de desenvolvimento local
npm test           # suíte de testes unitários (Vitest)
npm run check      # verificação de tipos (svelte-check + tsconfig)
npm run lint       # análise estática com ESLint
npm run build      # compila a SPA estática em build/
npm run preview    # serve o build estático localmente
npm run test:e2e   # testes de ponta a ponta com Playwright
npm run validate   # verificação completa: check, lint, test e build
```

## Estrutura do Projeto

```text
legislative-activity-explorer/
  package.json
  vite.config.ts
  svelte.config.js
  tsconfig.json
  playwright.config.ts
  README.md
  static/
    _headers                            cabeçalhos HTTP e regras de cache para Cloudflare Pages
    robots.txt                          configuração de rastreamento para buscadores
    brand/
      legislative-activity-explorer-logo.svg  logotipo vetorial oficial da aplicação
  workers/
    legislativeProxy.ts                 worker Cloudflare para proxy CORS seguro e cache de borda
    legislativeProxy.test.ts            testes unitários do proxy com cache simulado
  src/
    app.html                            template HTML global com metadados e lang pt-BR
    app.css                             estilos globais, tema Tailwind CSS e acessibilidade
    routes/
      +layout.svelte                    shell global da aplicação e link de salto para acessibilidade
      +layout.ts                        configuração SPA estática (prerender ativo, SSR desativado)
      +page.svelte                      página principal e máquina de estados da interface
      AppSidebar.svelte                 barra lateral com atalhos, histórico e informações
      ConversationFlow.svelte           orquestrador do fluxo conversacional e balões
      pageViewModelMappers.ts           mapeamento reativo da store para o modelo da tela
    lib/
      api/
        camaraClient.ts                 cliente HTTP da API de Dados Abertos da Câmara dos Deputados
        senadoClient.ts                 cliente HTTP da API de Dados Abertos do Senado Federal
        httpMemoryCache.ts              cache em memória com expiração para requisições HTTP
        legislativeDataSourceConfig.ts  configuração de fontes de dados (modo direto vs. proxy)
        officialApiConfig.ts            endereços base, cabeçalhos e configurações das APIs oficiais
        officialApiErrors.ts            classificação e tratamento padronizado de erros de rede
      domain/
        types.ts                        contratos de parlamentares, proposições, votações e referências
        legislativeSource.ts            definição tipada das fontes (Câmara e Senado)
        votes.ts                        posições nominais (SIM, NÃO, ABSTENÇÃO) e contagens agregadas
        references.ts                   tipos de referências documentadas e fontes externas
        uiState.ts                      estados formais da máquina de navegação conversacional
      mappers/
        camaraMapper.ts                 normalizador de deputados, matérias e votações aos modelos de domínio
        senadoMapper.ts                 normalizador de senadores, processos legislativos e votações
        officialMapperError.ts          tratamento de inconsistências e falhas de contrato nos payloads
      services/
        officialSearchService.ts        motor de busca federado unificado com deduplicação e tolerância a falhas
        publicSearchService.ts          adaptador público de busca consumido pela store
        officialDetailService.ts        carregamento de detalhes de parlamentares e proposições
        officialVoteService.ts          busca, contagem e detalhamento de votações nominais
        legislativeIdentifierParser.ts  parser de identificadores legislativos oficiais (PL, PEC, MPV, etc.)
        factualSummaryService.ts        aplicação de resumos factuais verificados a partir do catálogo
        referenceService.ts             consolidação de referências documentadas e links externos
        urlNavigationService.ts         sincronização bidirecional entre o estado da aplicação e a URL
        officialNotices.ts              mensagens neutras e amigáveis para falhas parciais ou indisponibilidade
      data/
        factualSummaryCatalog.ts        catálogo versionado e auditado de resumos factuais
        referenceCatalog.ts             catálogo versionado de referências e links oficiais
      state/
        chatStore.svelte.ts             instância da store com reatividade Svelte 5
        chatStore.ts                    máquina de estados central e controle da sessão em memória
        chatStoreOperations.ts          ações e transições assíncronas do fluxo da store
        chatStoreHelpers.ts             funções utilitárias e reducers da store
      components/
        about/
          AboutPrivacyInfo.svelte       área informativa sobre neutralidade, dados e privacidade
        brand/
          ProductLogo.svelte            componente de exibição do logotipo vetorial oficial
        conversation/
          ConversationBubble.svelte     balão individual de mensagem no fluxo conversacional
          ConversationLog.svelte        container com semântica de log acessível para navegação
        parliamentarians/
          ParliamentarianDetail.svelte  perfil biográfico do parlamentar com foto oficial e atalhos
        proposals/
          BillDetail.svelte             detalhamento completo da proposição com ementa oficial
          ParliamentarianBills.svelte   listagem de proposições associadas ao parlamentar
          tabs/                         abas de fatos, fontes, ementa e votações da proposição
        search/
          InitialSearchForm.svelte      campo de busca inicial com validação e atalho Enter
          SearchResultCard.svelte       card individual de resultado (parlamentar ou proposição)
          SearchResults.svelte          grade agrupada de resultados de parlamentares e matérias
        votes/
          BillVotes.svelte              painel de votação com resultado oficial e contagens
          ParliamentarianVotes.svelte   histórico de votações nominais associadas ao parlamentar
          VoteBadge.svelte              etiqueta visual neutra e acessível para posições de voto
          votePresentation.ts           regras de apresentação visual sem viés valorativo
          tabs/                         abas de resumo, contagens e listagem nominal paginada
```
