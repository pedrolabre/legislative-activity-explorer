<script lang="ts">
  type SearchResult =
    | {
        kind: 'parliamentarian';
        id: string;
        name: string;
        office: string;
        party: string;
        state: string;
        status: string;
        chamber?: string;
        term?: string;
      }
    | {
        kind: 'proposal';
        id: string;
        title: string;
        chamber: string;
        type?: string;
        subjectLabel?: string;
        subject?: string;
        status: string;
      };

  let {
    result,
    onSelectParliamentarian,
    onSelectProposal
  }: {
    result: SearchResult;
    onSelectParliamentarian?: (id: string) => void;
    onSelectProposal?: (id: string) => void;
  } = $props();

  let resultTypeLabel = $derived(result.kind === 'parliamentarian' ? 'Parlamentar' : 'Proposição');

  function getChamber(res: SearchResult) {
    if ('chamber' in res && res.chamber) return res.chamber;
    if (
      res.id.startsWith('senado') ||
      ('office' in res && res.office.toLocaleLowerCase('pt-BR').includes('senad'))
    ) {
      return 'Senado Federal';
    }
    return 'Câmara dos Deputados';
  }

  let sourceLabel = $derived(getChamber(result));

  let parliamentarianSubtitle = $derived(
    result.kind === 'parliamentarian'
      ? `${result.office} · ${result.party}/${result.state}`
      : ''
  );

  let proposalSubtitle = $derived(
    result.kind === 'proposal'
      ? result.subject || 'Sem tema informado'
      : ''
  );

  let proposalType = $derived(
    result.kind === 'proposal'
      ? result.type ?? result.title.split(' ')[0] ?? 'Proposição'
      : ''
  );

  function handleSelectParliamentarian() {
    if (result.kind !== 'parliamentarian') {
      return;
    }

    onSelectParliamentarian?.(result.id);
  }

  function handleSelectProposal() {
    if (result.kind !== 'proposal') {
      return;
    }

    onSelectProposal?.(result.id);
  }
</script>

<article class="card">
  <div class="card-head">
    <span class="type">{resultTypeLabel}</span>
    <span class="card-source">{sourceLabel}</span>
  </div>

  {#if result.kind === 'parliamentarian'}
    <h3>{result.name}</h3>
    <p class="card-sub">{parliamentarianSubtitle}</p>
    <dl class="card-meta">
      <div>
        <dt>Situação</dt>
        <dd>{result.status}</dd>
      </div>
      <div>
        <dt>{result.term ? 'Legislatura' : 'UF'}</dt>
        <dd>{result.term ?? result.state}</dd>
      </div>
    </dl>
    {#if onSelectParliamentarian}
      <button
        type="button"
        class="btn secondary card-btn"
        aria-label={`Ver perfil de ${result.name}`}
        onclick={handleSelectParliamentarian}
      >
        Ver perfil
      </button>
    {/if}
  {:else}
    <h3>{result.title}</h3>
    <p class="card-sub">{proposalSubtitle}</p>
    <dl class="card-meta">
      <div>
        <dt>Situação</dt>
        <dd>{result.status}</dd>
      </div>
      <div>
        <dt>Tipo</dt>
        <dd>{proposalType}</dd>
      </div>
    </dl>
    {#if onSelectProposal}
      <button
        type="button"
        class="btn secondary card-btn"
        aria-label={`Ver detalhe de ${result.title}`}
        onclick={handleSelectProposal}
      >
        Ver proposição
      </button>
    {/if}
  {/if}
</article>

<style>
  .card {
    min-width: 0;
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 1px 3px rgba(23, 32, 39, 0.04);
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }

  .card:hover {
    border-color: var(--accent);
    box-shadow: 0 3px 8px rgba(0, 95, 115, 0.08);
  }

  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .type {
    margin: 0;
    color: var(--accent);
    font-size: 8px;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .card-source {
    font-size: 8px;
    font-weight: 750;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .card h3 {
    margin: 0;
    font-size: 16px;
    line-height: 1.2;
    font-weight: 700;
    color: var(--ink);
    overflow-wrap: anywhere;
  }

  .card-sub {
    margin: 4px 0 10px;
    font-size: 11px;
    color: var(--muted);
    font-weight: 500;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .card-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 12px;
    padding: 8px 10px;
    background: var(--surface);
    border-radius: 6px;
    border: 1px solid var(--border);
    margin: 0;
  }

  .card-meta dt {
    font-size: 8px;
    font-weight: 850;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .card-meta dd {
    margin: 2px 0 0;
    font-size: 10px;
    font-weight: 600;
    color: var(--ink);
    overflow-wrap: anywhere;
  }

  .card-btn {
    margin-top: 12px;
    align-self: flex-start;
    min-height: 30px;
    font-size: 10px;
    font-weight: 800;
    padding: 0 12px;
  }
</style>
