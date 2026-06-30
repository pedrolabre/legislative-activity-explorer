<script lang="ts">
  let { onBack, onStartOver }: { onBack: () => void; onStartOver: () => void } = $props();
</script>

<div class="space-y-6">
  <header>
    <p class="text-xs font-bold uppercase leading-5 tracking-normal text-accent">
      Informações públicas
    </p>
    <h3 class="mt-2 text-2xl font-semibold leading-8 text-ink">
      Sobre, privacidade e responsabilidade
    </h3>
    <p class="mt-3 text-sm leading-6 text-ink-muted">
      Esta área reúne informações sobre a finalidade do projeto, os limites da consulta e as
      escolhas de privacidade da aplicação.
    </p>
  </header>

  <section class="border-t border-border pt-5" aria-labelledby="about-purpose-title">
    <h4 id="about-purpose-title" class="text-sm font-bold leading-6 text-ink">
      Finalidade pública
    </h4>
    <p class="mt-3 text-sm leading-6 text-ink-muted">
      O projeto tem caráter público, cívico, educativo e acadêmico. A navegação guiada apresenta
      registros legislativos públicos.
    </p>
  </section>

  <section class="border-t border-border pt-5" aria-labelledby="about-neutrality-title">
    <h4 id="about-neutrality-title" class="text-sm font-bold leading-6 text-ink">
      Neutralidade institucional
    </h4>
    <p class="mt-3 text-sm leading-6 text-ink-muted">
      Esta aplicação não possui vínculo institucional com o Congresso Nacional, governo, partidos
      políticos, candidaturas, mandatos ou frentes políticas.
    </p>
    <p class="mt-3 text-sm leading-6 text-ink-muted">
      A interface apresenta registros legislativos sem orientar escolhas de voto, classificar
      parlamentares ou atribuir julgamento político a partidos, proposições ou votações.
    </p>
  </section>

  <section class="border-t border-border pt-5" aria-labelledby="about-privacy-title">
    <h4 id="about-privacy-title" class="text-sm font-bold leading-6 text-ink">
      Privacidade
    </h4>
    <ul class="mt-3 grid gap-2 text-sm leading-6 text-ink-muted">
      <li>Não há login, cadastro ou perfil de usuário.</li>
      <li>Não há cookies, LocalStorage, banco próprio, analytics ou rastreamento nesta aplicação.</li>
      <li>A consulta permanece apenas na memória da página aberta.</li>
      <li>Ao recarregar a página, o fluxo da consulta é reiniciado.</li>
    </ul>
  </section>

  <section class="border-t border-border pt-5" aria-labelledby="about-accessibility-title">
    <h4 id="about-accessibility-title" class="text-sm font-bold leading-6 text-ink">
      Acessibilidade
    </h4>
    <p class="mt-3 text-sm leading-6 text-ink-muted">
      A interface usa navegação guiada, controles nativos, foco visível e área conversacional com
      atualização anunciada por tecnologias assistivas.
    </p>
  </section>

  <section class="border-t border-border pt-5" aria-labelledby="about-sources-title">
    <h4 id="about-sources-title" class="text-sm font-bold leading-6 text-ink">
      Dados e fontes oficiais
    </h4>
    <p class="mt-3 text-sm leading-6 text-ink-muted">
      Os conteúdos legislativos são dados públicos de referência. Para conferência jurídica,
      administrativa ou jornalística, consulte as fontes oficiais da Câmara dos Deputados, do Senado
      Federal ou do órgão responsável pelo registro.
    </p>
  </section>

  <div class="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:flex-wrap">
    <button
      type="button"
      class="min-h-12 rounded-ui border border-border bg-surface-raised px-4 py-3 text-sm font-bold text-ink transition hover:border-accent"
      onclick={onBack}
    >
      Voltar à consulta
    </button>
    <button
      type="button"
      class="min-h-12 rounded-ui bg-accent px-4 py-3 text-sm font-bold text-white transition hover:bg-accent-strong"
      onclick={onStartOver}
    >
      Nova consulta
    </button>
  </div>
</div>
