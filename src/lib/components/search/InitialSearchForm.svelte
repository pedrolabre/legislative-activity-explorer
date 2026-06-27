<script lang="ts">
  let { onSearch }: { onSearch: (query: string) => void } = $props();

  let query = $state('');
  let errorMessage = $state('');

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      errorMessage = 'Informe um nome ou uma proposição para continuar.';
      return;
    }

    errorMessage = '';
    onSearch(trimmedQuery);
  }

  function handleSearchKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    (event.currentTarget as HTMLInputElement).form?.requestSubmit();
  }
</script>

<form
  class="border-t border-border pt-6"
  aria-labelledby="initial-search-title"
  onsubmit={handleSubmit}
>
  <div>
    <h2 id="initial-search-title" class="text-lg font-semibold leading-7 text-ink">
      Pesquisa inicial
    </h2>
    <label for="initial-search" class="mt-4 block text-sm font-bold leading-6 text-ink">
      Buscar parlamentar ou proposição
    </label>
  </div>

  <div class="mt-3 flex flex-col gap-3 sm:flex-row">
    <input
      id="initial-search"
      name="search"
      type="search"
      autocomplete="off"
      enterkeyhint="search"
      bind:value={query}
      onkeydown={handleSearchKeydown}
      aria-describedby={errorMessage ? 'initial-search-help initial-search-error' : 'initial-search-help'}
      aria-invalid={errorMessage ? 'true' : undefined}
      class="min-h-12 min-w-0 flex-1 rounded-ui border border-border bg-surface-raised px-4 py-3 text-base text-ink shadow-sm outline-none transition focus:border-focus"
    />
    <button
      type="submit"
      class="min-h-12 rounded-ui bg-accent px-5 py-3 text-base font-bold text-white transition hover:bg-accent-strong"
    >
      Buscar
    </button>
  </div>

  <p id="initial-search-help" class="mt-3 text-sm leading-6 text-ink-muted">
    A consulta permanece somente nesta página aberta.
  </p>

  {#if errorMessage}
    <p id="initial-search-error" class="mt-3 text-sm font-semibold leading-6 text-civic" role="alert">
      {errorMessage}
    </p>
  {/if}
</form>
