<script lang="ts">
  let { onBack, onStartOver }: { onBack: () => void; onStartOver: () => void } = $props();
</script>

<div class="about-container">
  <header class="about-head">
    <h2>Sobre, privacidade e responsabilidade</h2>
    <p>
      Esta área reúne informações sobre a finalidade do projeto, os limites da consulta e as escolhas de privacidade da aplicação.
    </p>
  </header>

  <div class="about-list">
    <div class="about-row">
      <h3 class="about-label">Finalidade pública</h3>
      <div class="about-desc">
        <p>
          O projeto tem caráter público, cívico, educativo e acadêmico. A navegação guiada apresenta registros legislativos públicos.
        </p>
      </div>
    </div>

    <div class="about-row">
      <h3 class="about-label">Neutralidade</h3>
      <div class="about-desc">
        <p>
          Esta aplicação não possui vínculo institucional com o Congresso Nacional, governo, partidos políticos, candidaturas, mandatos ou frentes políticas. A interface apresenta registros legislativos sem orientar escolhas de voto ou classificar parlamentares.
        </p>
      </div>
    </div>

    <div class="about-row">
      <h3 class="about-label">Privacidade</h3>
      <div class="about-desc">
        <ul>
          <li>Não há login, cadastro ou perfil de usuário.</li>
          <li>Não há cookies, LocalStorage, banco próprio, analytics ou rastreamento nesta aplicação.</li>
          <li>A consulta permanece apenas na memória da página aberta.</li>
          <li>Ao recarregar a página, o fluxo da consulta é reiniciado.</li>
        </ul>
      </div>
    </div>

    <div class="about-row">
      <h3 class="about-label">Acessibilidade</h3>
      <div class="about-desc">
        <p>
          A interface usa navegação guiada, controles nativos, foco visível e área conversacional com atualização anunciada por tecnologias assistivas.
        </p>
      </div>
    </div>

    <div class="about-row">
      <h3 class="about-label">Dados oficiais</h3>
      <div class="about-desc">
        <p>
          Os conteúdos legislativos são dados públicos de referência. Para conferência jurídica, administrativa ou jornalística, consulte as fontes oficiais da Câmara dos Deputados, do Senado Federal ou do órgão responsável pelo registro.
        </p>
      </div>
    </div>
  </div>

  <div class="about-actions">
    <button type="button" class="btn secondary" onclick={onBack}>
      ← Voltar à consulta
    </button>
    <button type="button" class="btn primary" onclick={onStartOver}>
      Nova consulta
    </button>
  </div>
</div>

<style>
  .about-container {
    display: flex;
    flex-direction: column;
  }

  .about-head {
    margin-bottom: 6px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }

  .about-head h2 {
    margin: 0;
    font-size: 17px;
    line-height: 1.2;
    font-weight: 650;
    color: var(--ink);
  }

  .about-head p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.4;
  }

  .about-list {
    display: flex;
    flex-direction: column;
  }

  .about-row {
    display: grid;
    grid-template-columns: 160px 1fr;
    gap: 20px;
    align-items: start;
    padding: 15px 4px;
    border-bottom: 1px solid rgba(204, 216, 211, 0.65);
  }

  .about-row:last-child {
    border-bottom: 0;
  }

  .about-label {
    margin: 0;
    font-size: 11px;
    font-weight: 800;
    color: var(--accent2);
    padding-top: 1px;
  }

  .about-desc {
    font-size: 10px;
    line-height: 1.6;
    color: var(--muted);
  }

  .about-desc p {
    margin: 0;
  }

  .about-desc ul {
    margin: 0;
    padding-left: 17px;
  }

  .about-desc li {
    margin-bottom: 4px;
    line-height: 1.55;
  }

  .about-desc li:last-child {
    margin-bottom: 0;
  }

  .about-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    padding-top: 16px;
    border-top: 1px solid rgba(204, 216, 211, 0.65);
    margin-top: 4px;
  }

  @media (max-width: 700px) {
    .about-head h2 {
      font-size: 15px;
    }

    .about-row {
      grid-template-columns: 1fr;
      gap: 4px;
      padding: 11px 0;
    }
  }
</style>
