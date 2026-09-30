<script lang="ts">
  let {
    onSearch,
    resetToken = 0
  }: { onSearch: (query: string) => void; resetToken?: number } = $props();

  let query = $state('');
  let errorMessage = $state('');
  let lastResetToken = $state<number | null>(null);

  $effect(() => {
    if (lastResetToken === null) {
      lastResetToken = resetToken;
      return;
    }

    if (resetToken === lastResetToken) {
      return;
    }

    query = '';
    errorMessage = '';
    lastResetToken = resetToken;
  });

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      errorMessage = 'Informe um nome de parlamentar ou termo de proposição para continuar.';
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
  class="form"
  id="form"
  aria-labelledby="initial-search-label"
  onsubmit={handleSubmit}
>
  <label id="initial-search-label" for="initial-search" class="search-label">
    Nome de parlamentar ou termo de proposição
  </label>

  <div class="row">
    <input
      id="initial-search"
      name="search"
      type="search"
      placeholder="Nome de parlamentar ou proposição"
      autocomplete="off"
      enterkeyhint="search"
      bind:value={query}
      onkeydown={handleSearchKeydown}
      aria-describedby={errorMessage ? 'initial-search-error' : undefined}
      aria-invalid={errorMessage ? 'true' : undefined}
      class="input"
    />
    <button
      type="submit"
      class="btn primary"
    >
      Buscar
    </button>
  </div>

  {#if errorMessage}
    <p id="initial-search-error" class="search-error" role="alert">
      {errorMessage}
    </p>
  {/if}
</form>

<style>
  .form {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
  }

  .search-label {
    display: block;
    margin-bottom: 6px;
    font-size: 11px;
    font-weight: 800;
    color: var(--ink);
  }

  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 6px;
  }

  .input {
    min-width: 0;
    height: 38px;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0 10px;
    font-size: 12px;
    color: var(--ink);
    background: var(--white);
    transition: border-color 0.15s ease;
  }

  .input:focus,
  .input:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
    border-color: var(--accent);
  }

  .search-error {
    margin-top: 8px;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--gold);
  }

  @media (max-width: 700px) {
    .form {
      grid-area: form;
      margin: 0;
      padding: 0;
      border: 0;
    }

    .search-label {
      display: none;
    }

    .row {
      gap: 5px;
    }

    .input {
      height: 34px;
      font-size: 11px;
      padding: 0 8px;
    }

    .row :global(.btn) {
      min-height: 34px;
      padding: 0 9px;
      font-size: 10px;
    }

    :global(.side.is-maximized) .form {
      display: block;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }

    :global(.side.is-maximized) .search-label {
      display: block;
      margin-bottom: 6px;
      font-size: 11px;
      font-weight: 800;
    }

    :global(.side.is-maximized) .row {
      gap: 6px;
    }

    :global(.side.is-maximized) .input {
      height: 38px;
      font-size: 12px;
      padding: 0 10px;
    }

    :global(.side.is-maximized) .row :global(.btn) {
      min-height: 38px;
      padding: 0 12px;
      font-size: 11px;
    }
  }
</style>
