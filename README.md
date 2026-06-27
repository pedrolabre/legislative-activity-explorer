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

O projeto já foi iniciado com SvelteKit, TypeScript, Tailwind CSS, Vitest e build estático. A estrutura atual concentra a fundação web da aplicação, o shell conversacional inicial, resultados de busca e detalhe de parlamentar com dados de exemplo controlados.

* `src/app.html`: HTML global da aplicação, com idioma `pt-BR` e metadados iniciais.
* `src/app.css`: Import do Tailwind CSS, tokens iniciais de tema e estilos globais de base, contraste e foco visível.
* `src/lib/components/conversation/ConversationBubble.svelte`: Balão visual para mensagens da experiência conversacional.
* `src/lib/components/conversation/ConversationLog.svelte`: Container conversacional com semântica de log e atualização acessível.
* `src/lib/components/parliamentarians/ParliamentarianDetail.svelte`: Perfil factual de parlamentar com foto quando disponível, alternativa acessível sem foto e controles iniciais de consulta.
* `src/lib/components/search/InitialSearchForm.svelte`: Formulário inicial de busca com label, envio por `Enter` e validação local.
* `src/lib/components/search/SearchResultCard.svelte`: Card factual para item de resultado de parlamentar ou proposição, com abertura de perfil para parlamentares.
* `src/lib/components/search/SearchResults.svelte`: Lista de resultados agrupada por parlamentares e proposições, incluindo estado vazio e seleção de parlamentar.
* `src/lib/data/initialSearchFixtures.ts`: Dados de exemplo controlados para validar a busca inicial sem APIs oficiais.
* `src/lib/data/initialSearchFixtures.test.ts`: Testes unitários da busca inicial local.
* `src/lib/data/parliamentarianDetailFixtures.ts`: Dados de exemplo controlados para o detalhe factual de parlamentar.
* `src/lib/data/parliamentarianDetailFixtures.test.ts`: Testes unitários do detalhe local de parlamentar.
* `src/routes/+layout.ts`: Configuração da SPA estática com prerender habilitado e SSR desabilitado.
* `src/routes/+layout.svelte`: Shell global mínimo, import dos estilos e link de salto para acessibilidade.
* `src/routes/+page.svelte`: Tela `WELCOME` pública com shell conversacional, busca inicial local e estados `SEARCHING`, `SEARCH_RESULTS` e `PARLIAMENTARIAN_DETAIL`.
* `static/parliamentarians/ana-costa.svg`: Imagem local neutra usada no perfil com foto disponível.
* `static/robots.txt`: Configuração inicial de indexação.

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
