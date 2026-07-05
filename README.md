# legislative-activity-explorer

> Produto: **O que o parlamentar fez**  
> Consulta pública sobre projetos e votações do Congresso Nacional.

---

## Por que fiz esse projeto

Sempre achei estranho que acompanhar o histórico legislativo de um parlamentar exigisse abrir vários sites diferentes, entender termos jurídicos e navegar por interfaces públicas pouco amigáveis. Resolvi construir uma ferramenta que diminuísse essa barreira.

Meu objetivo não é dizer em quem alguém deve votar, nem criar rankings políticos. Quero apenas facilitar o acesso às informações públicas oficiais (da Câmara dos Deputados e do Senado Federal) para que cada pessoa tire suas próprias conclusões sobre a atuação de seus representantes.

---

## Decisões de projeto

Quando comecei esse projeto, minha principal preocupação era não criar mais uma plataforma política partidária. Meu objetivo é facilitar o acesso a dados públicos sem interpretar ou julgar as decisões dos parlamentares.

Para isso, defini algumas regras para o projeto:

* **Interface guiada:** O app usa uma metáfora de chat conversacional, mas não é um chat aberto. O usuário pesquisa um parlamentar ou projeto na tela inicial e depois navega clicando em botões pré-definidos. Isso evita a necessidade de interpretar textos livres e torna o fluxo muito simples de seguir no celular.
* **Resumos factuais:** O MVP deve exibir a ementa oficial do projeto e, quando tecnicamente viável, uma versão simplificada baseada nesse texto. A aplicação não promete resumir todas as emendas, substitutivos, pareceres ou alterações posteriores.
* **Transparência e fontes:** O MVP deve priorizar links oficiais dos projetos consultados. Links jornalísticos ou institucionais podem ser adicionados depois, conforme disponibilidade e viabilidade técnica.

---

## O que decidi não implementar (e por quê)

Decisões de exclusão de funcionalidades são tão importantes quanto o código que escrevo. Aqui está o que decidi deixar de fora de propósito:

* **IA Generativa em produção:** Não uso LLMs para resumir votações ou ementas. Quero que a mesma consulta sempre produza o mesmo resultado, sem o risco de alucinações ou distorções dos dados oficiais.
* **Banco de dados e login:** O app funciona direto no navegador do usuário. Não preciso salvar seus dados, histórico de buscas ou criar perfis. Isso protege a privacidade de quem pesquisa e elimina o custo de manutenção de servidores de banco de dados.
* **Analytics e rastreadores:** Não utilizo cookies de rastreamento, pixels de redes sociais ou ferramentas de monitoração invasivas. O que você pesquisa fica no seu dispositivo. Não tenho interesse em saber o que as pessoas pesquisam.
* **Recomendações e filtros políticos:** Não há recomendação de votos, classificação ideológica ("esquerda", "direita", "centro") ou agrupamento de projetos por visões específicas de "bom" ou "ruim".

---

## Stack técnica

Escolhi SvelteKit porque queria sair da zona de conforto do React e explorar uma stack frontend diferente. Também achei que ele combina bem com um projeto que precisa carregar rápido no celular, ter boa experiência em dispositivos simples e funcionar melhor em conexões móveis lentas.

* **SvelteKit + TypeScript:** Para criar uma SPA (Single Page Application) estática de alto desempenho e tipos bem definidos para mapear as APIs públicas.
* **Tailwind CSS:** Para estilizar a interface de forma rápida, moderna e focada em utilitários de acessibilidade (como foco de teclado e contraste).
* **Cloudflare Pages:** Onde hospedo a aplicação. Como a compilação gera um site estático, consigo hospedar gratuitamente e escalar sem me preocupar com infraestrutura de servidores.
* **Cloudflare Workers:** Se eu realmente precisar, vou adicionar um Cloudflare Worker para rodar como um proxy simples, apenas para resolver os problemas de CORS com as APIs oficiais e fazer um cache rápido temporário.

---

## Estrutura atual

O projeto já foi iniciado com SvelteKit, TypeScript, Tailwind CSS, Vitest e build estático. A estrutura atual concentra a fundação web da aplicação, o shell conversacional inicial, busca pública oficial como comportamento padrão, resultados de busca, detalhe de parlamentar, lista de proposições associadas, detalhe de proposição, estados de votações indisponíveis no fluxo oficial, services internos de fixtures controladas para testes, clients e mappers isolados da Câmara dos Deputados e do Senado Federal, área informativa sobre neutralidade, privacidade, responsabilidade e acessibilidade e um Worker opcional isolado para proxy CORS das APIs oficiais.

* `vite.config.ts`: Configuração do Vite, SvelteKit, Tailwind CSS e Vitest, incluindo testes unitários em `src/` e `workers/`.
* `src/app.html`: HTML global da aplicação, com idioma `pt-BR` e metadados iniciais.
* `src/app.css`: Import do Tailwind CSS, tokens iniciais de tema e estilos globais de base, contraste e foco visível.
* `src/lib/api/camaraClient.ts`: Client HTTP base da Câmara dos Deputados, com tipos mínimos de payload, detalhe, busca/listagem de deputados, proposições e votações por proposição, timeout configurável e erro recuperável.
* `src/lib/api/camaraClient.test.ts`: Testes unitários do client da Câmara com `fetch` injetado, timeout controlado, busca/listagem/votações controladas e sem rede real.
* `src/lib/api/legislativeDataSourceConfig.ts`: Configuracao publica e testavel para escolher chamadas diretas as APIs oficiais ou roteamento futuro por Worker opcional, sem segredos no frontend.
* `src/lib/api/legislativeDataSourceConfig.test.ts`: Testes unitarios da configuracao de fonte de dados, cobrindo fallback direto, URL publica de proxy, rejeicao de configuracao insegura e `fetch` injetado sem rede real.
* `src/lib/api/senadoClient.ts`: Client HTTP base do Senado Federal, com tipos mínimos de payload, suporte a JSON por sufixo ou cabeçalho, lista de senadores, pesquisa de matérias, timeout configurável e erro recuperável.
* `src/lib/api/senadoClient.test.ts`: Testes unitários do client do Senado com `fetch` injetado, timeout controlado, envelopes controlados, busca/listagem controlada e sem rede real.
* `src/lib/components/about/AboutPrivacyInfo.svelte`: Área informativa pública sobre finalidade do projeto, neutralidade institucional, privacidade, acessibilidade e consulta a fontes oficiais.
* `src/lib/components/brand/ProductLogo.svelte`: Componente reutilizavel e acessivel para renderizar o logotipo oficial em SVG sem conversao para PNG.
* `src/lib/components/conversation/ConversationBubble.svelte`: Balão visual para mensagens da experiência conversacional.
* `src/lib/components/conversation/ConversationLog.svelte`: Container conversacional com semântica de log e atualização acessível.
* `src/lib/components/parliamentarians/ParliamentarianDetail.svelte`: Perfil factual de parlamentar com foto quando disponível, alternativa acessível sem foto e controles para abrir proposições e votações associadas.
* `src/lib/components/proposals/BillDetail.svelte`: Detalhe factual de proposição com dados gerais, ementa oficial, resumo factual revisado apenas quando disponível em catálogo versionado, indisponibilidade neutra para resumo ausente, fontes e referências revisadas, aceitando abertura associada a parlamentar ou consulta direta.
* `src/lib/components/proposals/BillDetail.test.ts`: Testes unitários do detalhe de proposição, cobrindo separação entre ementa oficial, resumo factual revisado e resumo indisponível.
* `src/lib/components/proposals/ParliamentarianBills.svelte`: Lista factual de proposições associadas a parlamentar, com dados parciais tratados de forma neutra.
* `src/lib/components/search/InitialSearchForm.svelte`: Formulário inicial de busca com label, envio por `Enter` e validação local.
* `src/lib/components/search/SearchResultCard.svelte`: Card factual para item de resultado de parlamentar ou proposição, com abertura de perfil para parlamentares e abertura de detalhe para proposições oficiais.
* `src/lib/components/search/SearchResults.svelte`: Lista de resultados agrupada por parlamentares e proposições, incluindo estado vazio, seleção de parlamentar e seleção de proposição oficial.
* `src/lib/components/votes/BillVotes.svelte`: Detalhe factual de votação com identificação da proposição, resultado quando disponível, contagens agregadas, lista nominal e destaque neutro do parlamentar selecionado quando disponível.
* `src/lib/components/votes/ParliamentarianVotes.svelte`: Lista factual de votações associadas a parlamentar ou à proposição aberta, com cobertura parcial da sessão para parlamentar oficial e dados parciais tratados de forma neutra.
* `src/lib/components/votes/ParliamentarianVotes.test.ts`: Testes unitários da lista de votações por parlamentar, cobrindo estado vazio oficial específico e cobertura parcial da sessão.
* `src/lib/components/votes/VoteBadge.svelte`: Rótulo visual neutro e acessível para votos `SIM`, `NÃO`, `ABSTENÇÃO` e `AUSENTE`.
* `src/lib/components/votes/votePresentation.ts`: Politica visual auditada para labels e classes neutras de votos.
* `src/lib/components/votes/votePresentation.test.ts`: Testes unitarios da politica visual de votos, cobrindo labels oficiais e ausencia de tokens verde/vermelho.
* `src/lib/data/initialSearchFixtures.ts`: Dados de exemplo controlados para validar a busca inicial sem APIs oficiais.
* `src/lib/data/initialSearchFixtures.test.ts`: Testes unitários da busca inicial local.
* `src/lib/data/parliamentarianBillFixtures.ts`: Dados de exemplo controlados para proposições associadas e detalhe de proposição.
* `src/lib/data/parliamentarianBillFixtures.test.ts`: Testes unitários da lista e do detalhe local de proposições.
* `src/lib/data/parliamentarianDetailFixtures.ts`: Dados de exemplo controlados para o detalhe factual de parlamentar.
* `src/lib/data/parliamentarianDetailFixtures.test.ts`: Testes unitários do detalhe local de parlamentar.
* `src/lib/data/parliamentarianVoteFixtures.ts`: Dados de exemplo controlados para votações associadas e detalhe de votação.
* `src/lib/data/parliamentarianVoteFixtures.test.ts`: Testes unitários da lista e do detalhe local de votações.
* `src/lib/data/factualSummaryCatalog.ts`: Catalogo versionado e revisavel de resumos factuais revisados para proposicoes legislativas controladas.
* `src/lib/data/factualSummaryCatalog.test.ts`: Testes unitarios do catalogo de resumos factuais, cobrindo contrato, datas de revisao e ausencia de linguagem valorativa conhecida.
* `src/lib/data/referenceCatalog.ts`: Catalogo versionado e revisavel de referencias externas para proposicoes legislativas controladas.
* `src/lib/data/referenceCatalog.test.ts`: Testes unitarios do catalogo de referencias, cobrindo contrato, tipos, ids, URLs externas e datas de revisao.
* `src/lib/domain/index.ts`: Exportações centralizadas dos contratos de domínio e tipos auxiliares.
* `src/lib/domain/legislativeSource.ts`: Constantes e união de fontes legislativas normalizadas.
* `src/lib/domain/references.ts`: Constantes e união de tipos de referência externa.
* `src/lib/domain/types.ts`: Contratos centrais para parlamentares, proposições, votações, votos individuais e referências externas.
* `src/lib/domain/uiState.ts`: Constantes e união dos estados previstos da interface conversacional.
* `src/lib/domain/votes.ts`: Constantes, união de posições de voto e contagens agregadas.
* `src/lib/mappers/camaraMapper.ts`: Mapper da Câmara para normalizar deputados, proposições, temas, votações e votos individuais aos contratos de domínio.
* `src/lib/mappers/camaraMapper.test.ts`: Testes unitários do mapper da Câmara com payloads completos, parciais, inválidos e votos individuais oficiais controlados.
* `src/lib/mappers/senadoMapper.ts`: Mapper do Senado para normalizar senadores e matérias aos contratos de domínio.
* `src/lib/mappers/senadoMapper.test.ts`: Testes unitários do mapper do Senado com payloads aninhados, parciais e inválidos.
* `src/lib/services/factualSummaryService.ts`: Service interno para aplicar resumos factuais revisados ao detalhe de proposicao sem geracao dinamica.
* `src/lib/services/factualSummaryService.test.ts`: Testes unitarios do service de resumos factuais, cobrindo aplicacao revisada, descarte de resumo nao catalogado e ausencia de inferencia pela ementa oficial.
* `src/lib/services/fixtureAdapters.ts`: Adaptadores internos que convertem fixtures controladas para contratos de domínio.
* `src/lib/services/parliamentarianService.ts`: Service interno para detalhe de parlamentar baseado nas fixtures existentes.
* `src/lib/services/parliamentarianService.test.ts`: Testes unitários do service interno de parlamentar.
* `src/lib/services/proposalService.ts`: Service interno para proposições associadas e detalhe de proposição baseado nas fixtures existentes, com combinação de referências editoriais revisadas.
* `src/lib/services/proposalService.test.ts`: Testes unitários do service interno de proposições e das referências associadas.
* `src/lib/services/officialApiClientFactory.ts`: Factory testável dos clients oficiais, conectando chamadas diretas ou roteamento por proxy público opcional sem segredos no frontend.
* `src/lib/services/officialApiClientFactory.test.ts`: Testes unitários da factory de clients oficiais com `fetch` injetado, modo direto, modo proxy e sem rede real.
* `src/lib/services/officialSearchService.ts`: Service isolado de busca oficial unificada, combinando Câmara e Senado em contratos de domínio com relatório de falhas recuperáveis, timeouts, dados parciais por fonte, clients configurados por direct/proxy e detecção direta limitada de proposições `PL`, `PEC` e `PLP`.
* `src/lib/services/officialSearchService.test.ts`: Testes unitários da busca oficial unificada com clients controlados, timeout, falha parcial, ordenação neutra, deduplicação objetiva, detecção direta limitada de proposições e sem rede real.
* `src/lib/services/publicSearchService.ts`: Adapter da busca pública padrão, convertendo `officialSearchService` para o contrato da store e preservando mensagens recuperáveis de falhas oficiais parciais, falhas completas, busca direta ambígua ou proposição oficial não encontrada.
* `src/lib/services/publicSearchService.test.ts`: Testes unitários do adapter de busca pública oficial com clients controlados, falha parcial, falha completa, busca direta de proposição e sem fallback para fixtures.
* `src/lib/services/officialDetailService.ts`: Service isolado para detalhe oficial de parlamentar, proposições oficiais associadas e detalhe oficial de proposição ou matéria, com clients configurados por direct/proxy e estados recuperáveis de indisponibilidade, timeout ou falha parcial.
* `src/lib/services/officialDetailService.test.ts`: Testes unitários dos detalhes oficiais com clients controlados, timeout, dados parciais, indisponibilidade do Senado para matérias associadas e sem rede real.
* `src/lib/services/officialVoteService.ts`: Service isolado para votações oficiais da Câmara associadas à proposição aberta, com detalhe de votação, lista nominal quando disponível, limite de paginação leve e sem fallback para fixtures.
* `src/lib/services/officialVoteService.test.ts`: Testes unitários das votações oficiais da Câmara com clients controlados, falhas parciais, paginação limitada, indisponibilidade do Senado neste bloco e sem rede real.
* `src/lib/services/referenceService.ts`: Service interno para combinar referências existentes da proposição com o catálogo revisado e identificar cobertura editorial incompleta.
* `src/lib/services/referenceService.test.ts`: Testes unitários da combinação de referências, prioridade do catálogo e fallback de cobertura revisada incompleta.
* `src/lib/services/searchService.ts`: Service interno de busca inicial por fixtures, mantido como caminho explícito e injetável para testes ou desenvolvimento controlado.
* `src/lib/services/searchService.test.ts`: Testes unitários do service interno de busca inicial.
* `src/lib/services/voteService.ts`: Service interno para votações associadas e detalhe de votação baseado nas fixtures existentes.
* `src/lib/services/voteService.test.ts`: Testes unitários do service interno de votações.
* `src/lib/state/chatStore.ts`: Store central em memória e actions da máquina de estados do fluxo conversacional, com busca pública oficial como caminho padrão, fixtures apenas por injeção explícita, seleção gradual de detalhes oficiais, abertura direta de proposição oficial confiável e mensagens recuperáveis quando fontes oficiais retornam dados parciais ou falham.
* `src/lib/state/chatStore.test.ts`: Testes unitários das actions da store conversacional, incluindo busca oficial padrão mockada, fixtures injetadas explicitamente, detalhes oficiais, dado parcial controlado e sem rede real.
* `src/routes/+layout.ts`: Configuração da SPA estática com prerender habilitado e SSR desabilitado.
* `src/routes/+layout.svelte`: Shell global mínimo, import dos estilos e link de salto para acessibilidade.
* `src/routes/+page.svelte`: Tela `WELCOME` pública com shell conversacional consumindo a store central, busca inicial oficial, avisos recuperáveis mínimos, detalhe direto de proposição e estados `SEARCHING`, `SEARCH_RESULTS`, `PARLIAMENTARIAN_DETAIL`, `PARLIAMENTARIAN_BILLS`, `PARLIAMENTARIAN_VOTES`, `BILL_DETAIL`, `BILL_VOTES`, `ABOUT` e `ERROR`.
* `static/_headers`: Cabeçalhos estáticos mínimos para Cloudflare Pages, sem CSP dependente de domínio futuro e sem cache persistente de navegador criado pela aplicação.
* `static/brand/profile_logo_traced.svg`: Logotipo oficial do produto em SVG original, incorporado como asset vetorial publico.
* `static/parliamentarians/ana-costa.svg`: Imagem local neutra usada no perfil com foto disponível.
* `static/robots.txt`: Configuração inicial de indexação.
* `workers/legislativeProxy.ts`: Worker opcional e isolado para proxy CORS seguro das APIs oficiais, limitado a `GET`, `OPTIONS`, allowlist estrita e cache temporário de borda.
* `workers/legislativeProxy.test.ts`: Testes unitários do Worker com `fetch` e cache injetados, sem rede real.

---

## Como rodar localmente

### Pré-requisitos
* Node.js (v18 ou superior)

### Instalação
```bash
# Clone o repositório
git clone https://github.com/pedrolabre/legislative-activity-explorer.git
cd legislative-activity-explorer

# Instale as dependências
npm install
```

### Desenvolvimento
```bash
npm run dev -- --open
```

---

## Sobre neutralidade

Se alguém me perguntar qual é a posição política deste projeto, minha resposta é simples:

> Trata-se de um explorador de dados construído sobre registros legislativos públicos.

Essa frase resume exatamente o objetivo técnico e neutro da ferramenta.
