<svelte:head>
  <title>O que o parlamentar fez</title>
</svelte:head>

<main id="conteudo" class="home">
  <section class="intro" aria-labelledby="home-title">
    <p class="eyebrow">Consulta pública</p>
    <h1 id="home-title">O que o parlamentar fez</h1>
    <p class="lead">Consulta pública sobre projetos e votações do Congresso Nacional.</p>
    <p>
      Um explorador de dados construído sobre registros legislativos públicos, com foco em
      clareza, neutralidade e privacidade.
    </p>
  </section>
</main>

<style>
  .home {
    display: grid;
    min-height: 100vh;
    padding: 2rem;
    place-items: center;
  }

  .intro {
    width: min(100%, 48rem);
  }

  .eyebrow {
    margin: 0 0 0.75rem;
    color: #0f766e;
    font-size: 0.875rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  h1 {
    max-width: 12ch;
    margin: 0;
    color: #0f172a;
    font-size: clamp(2.75rem, 10vw, 5.75rem);
    line-height: 0.95;
  }

  p {
    max-width: 40rem;
    color: #334155;
    font-size: 1.0625rem;
    line-height: 1.7;
  }

  .lead {
    margin-top: 1.5rem;
    color: #1e293b;
    font-size: 1.25rem;
  }

  @media (max-width: 36rem) {
    .home {
      align-items: start;
      padding: 1.25rem;
      padding-top: 5rem;
    }

    h1 {
      max-width: 10ch;
      font-size: 3.25rem;
    }
  }
</style>
