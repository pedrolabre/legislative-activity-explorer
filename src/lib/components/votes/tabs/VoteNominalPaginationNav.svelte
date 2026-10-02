<script lang="ts">
  let {
    currentPage = 1,
    totalPages = 1,
    onPageChange
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (targetPage: number) => void;
  } = $props();
</script>

<nav class="pagination-nav" aria-label="Navegação da lista nominal">
  <button
    type="button"
    class="btn-nav"
    disabled={currentPage <= 1}
    onclick={() => onPageChange(1)}
    aria-label="Primeira página"
  >
    « Primeira
  </button>
  <button
    type="button"
    class="btn-nav"
    disabled={currentPage <= 1}
    onclick={() => onPageChange(currentPage - 1)}
    aria-label="Página anterior"
  >
    ‹ Anterior
  </button>
  <span class="page-indicator" aria-current="page">
    Página {currentPage} de {totalPages}
  </span>
  <button
    type="button"
    class="btn-nav"
    disabled={currentPage >= totalPages}
    onclick={() => onPageChange(currentPage + 1)}
    aria-label="Próxima página"
  >
    Próxima ›
  </button>
  <button
    type="button"
    class="btn-nav"
    disabled={currentPage >= totalPages}
    onclick={() => onPageChange(totalPages)}
    aria-label="Última página"
  >
    Última »
  </button>
</nav>

<style>
  .pagination-nav {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding-top: 8px;
  }

  .btn-nav {
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    color: var(--ink);
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.14s ease;
  }

  .btn-nav:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  .btn-nav:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .page-indicator {
    padding: 4px 8px;
    font-size: 11px;
    font-weight: 700;
    color: var(--ink);
  }
</style>
