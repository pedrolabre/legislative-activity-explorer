<script lang="ts">
  import { formatCheckedAt } from '$lib/ui/dateFormatters';

  interface SourceItem {
    id: string;
    type: 'official' | 'press' | 'technical' | 'institutional';
    label: string;
    title: string;
    publisher: string;
    url: string;
    checkedAt?: string;
  }

  let {
    sources,
    hasCompleteReviewedReferences
  }: {
    sources: SourceItem[];
    hasCompleteReviewedReferences: boolean;
  } = $props();

  const unavailableOfficialSourceMessage =
    'Fonte oficial da proposição não foi retornada no dado disponível nesta consulta.';
  const noReviewedReferencesMessage =
    'Conjunto completo de referências externas revisadas ainda não foi adicionado para esta proposição.';
</script>

<div class="detail-sheet">
  <div class="sheet-section">
    <h4>Fontes e referências</h4>

    {#if sources.length > 0}
      <div class="sources-list">
        {#each sources as source (source.id)}
          <article class="source-card">
            <p class="source-type">Tipo: {source.label}</p>
            <a
              class="official-link bold-link"
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {source.title}<span class="sr-only"> abre em nova aba</span>
            </a>
            <dl class="source-meta">
              <div>
                <dt>Publicador</dt>
                <dd>{source.publisher}</dd>
              </div>
              {#if formatCheckedAt(source.checkedAt)}
                <div>
                  <dt>Data de revisão</dt>
                  <dd>{formatCheckedAt(source.checkedAt)}</dd>
                </div>
              {/if}
            </dl>
          </article>
        {/each}
      </div>
    {:else}
      <div class="sheet-notice" role="status">
        <p class="text-muted">
          {unavailableOfficialSourceMessage}
        </p>
      </div>
    {/if}

    {#if !hasCompleteReviewedReferences}
      <div class="sheet-notice mt-notice" role="status">
        <p class="text-muted">
          {noReviewedReferencesMessage}
        </p>
      </div>
    {/if}
  </div>
</div>

<style>
  .detail-sheet {
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
    box-shadow: 0 1px 3px rgba(23, 32, 39, 0.04);
  }

  .sheet-section h4 {
    margin: 0 0 6px;
    font-size: 10px;
    font-weight: 850;
    color: var(--accent2);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .sources-list {
    display: grid;
    gap: 8px;
    margin-top: 8px;
  }

  .source-card {
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    padding: 9px 11px;
  }

  .source-type {
    margin: 0;
    font-size: 8px;
    font-weight: 850;
    text-transform: uppercase;
    color: var(--accent);
  }

  .official-link {
    display: inline-block;
    color: var(--accent2);
    font-weight: 800;
    text-decoration: none;
    overflow-wrap: anywhere;
  }

  .official-link:hover {
    text-decoration: underline;
  }

  .bold-link {
    font-size: 11px;
    line-height: 1.4;
    margin: 2px 0 4px;
  }

  .source-meta {
    display: grid;
    gap: 3px;
    margin: 4px 0 0;
    font-size: 10px;
    line-height: 1.35;
    color: var(--muted);
  }

  .source-meta dt {
    font-weight: 700;
    color: var(--ink);
    display: inline;
    margin-right: 4px;
  }

  .source-meta dd {
    display: inline;
    margin: 0;
  }

  .sheet-notice {
    margin-top: 10px;
    padding: 10px 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
  }

  .mt-notice {
    margin-top: 10px;
  }

  .text-muted {
    color: var(--muted);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
