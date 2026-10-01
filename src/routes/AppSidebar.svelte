<script lang="ts">
  import ProductLogo from '$lib/components/brand/ProductLogo.svelte';
  import InitialSearchForm from '$lib/components/search/InitialSearchForm.svelte';

  interface Props {
    onSearch: (query: string) => void;
    onOpenAbout: () => void;
    resetToken?: number;
  }

  let { onSearch, onOpenAbout, resetToken = 0 }: Props = $props();

  let sideMaximized = $state(false);
  let sideElement = $state<HTMLElement | null>(null);
  let touchStartY = 0;

  export function collapse(): void {
    sideMaximized = false;
  }

  $effect(() => {
    if (resetToken > 0) {
      sideMaximized = false;
    }
  });

  function toggleSideMaximized() {
    sideMaximized = !sideMaximized;
  }

  function handleBrandClick() {
    if (typeof window !== 'undefined' && window.innerWidth <= 700 && !sideMaximized) {
      sideMaximized = true;
    }
  }

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    if (typeof window !== 'undefined' && window.innerWidth > 700) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diffY = touchEndY - touchStartY;
    if (diffY > 30 && !sideMaximized) {
      sideMaximized = true;
    } else if (diffY < -30 && sideMaximized) {
      sideMaximized = false;
    }
  }

  function handleWindowClick(e: MouseEvent) {
    if (typeof window !== 'undefined' && window.innerWidth <= 700 && sideMaximized) {
      const target = e.target as Node | null;
      if (sideElement && target && !sideElement.contains(target)) {
        sideMaximized = false;
      }
    }
  }

  function handleFormSearch(query: string) {
    sideMaximized = false;
    onSearch(query);
  }
</script>

<svelte:window onclick={handleWindowClick} />

<aside
  bind:this={sideElement}
  id="side"
  class={`side ${sideMaximized ? 'is-maximized' : ''}`}
  ontouchstart={handleTouchStart}
  ontouchend={handleTouchEnd}
  aria-label="Barra lateral de consulta"
>
  <div
    class="brand"
    role="button"
    tabindex="0"
    onclick={handleBrandClick}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleBrandClick();
      }
    }}
  >
    <ProductLogo showText={false} decorative class="brand-logo" />
    <div>
      <h1 id="home-title">O que o parlamentar fez</h1>
    </div>
  </div>

  <p class="intro">
    <strong>Consulte projetos e votações</strong> do Congresso Nacional a partir de registros oficiais disponíveis.
  </p>

  <InitialSearchForm onSearch={handleFormSearch} {resetToken} />

  <div class="side-bottom">
    <button
      type="button"
      class="btn secondary wide"
      onclick={onOpenAbout}
    >
      Sobre e privacidade
    </button>
  </div>

  <button
    id="sideHandle"
    class="side-handle"
    type="button"
    aria-label={sideMaximized ? 'Deslizar para recolher' : 'Deslizar para expandir'}
    aria-expanded={sideMaximized}
    onclick={toggleSideMaximized}
  >
    <span class="handle-track">
      <span class="handle-line"></span>
      <span class="handle-line"></span>
      <span class="handle-line"></span>
    </span>
  </button>
</aside>

<style>
  .side {
    min-height: 0;
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(23, 32, 39, 0.06);
    background: var(--white);
    border-top: 4px solid var(--gold);
    padding: 16px 14px;
    display: flex;
    flex-direction: column;
  }

  .side-handle {
    display: none;
  }

  .brand {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .brand h1 {
    margin: 0;
    font-size: 18px;
    line-height: 1.15;
    font-weight: 650;
    color: var(--ink);
  }

  .intro {
    margin: 14px 0 0;
    padding-top: 14px;
    border-top: 1px solid var(--border);
    font-size: 12px;
    line-height: 1.5;
    color: var(--muted);
  }

  .intro strong {
    color: var(--ink);
  }

  .side-bottom {
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid var(--border);
  }

  @media (max-width: 700px) {
    .side {
      padding: 8px 10px 4px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
      grid-template-areas:
        "brand form"
        "handle handle";
      gap: 4px 8px;
      align-items: center;
      border-top-width: 3px;
      transition: background-color 0.15s ease;
    }

    .brand {
      grid-area: brand;
      display: flex;
      gap: 7px;
      align-items: center;
      min-width: 0;
      overflow: hidden;
      cursor: pointer;
    }

    .brand h1 {
      font-size: 11px;
      line-height: 1.15;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 0;
    }

    .intro,
    .side-bottom {
      display: none;
    }

    .side-handle {
      grid-area: handle;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      padding: 4px 0 2px;
      background: transparent;
      border: 0;
      cursor: pointer;
      touch-action: manipulation;
    }

    .handle-track {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2.5px;
      padding: 3px 18px;
      border-radius: 99px;
      background: rgba(204, 216, 211, 0.45);
      transition: all 0.15s ease;
    }

    .side-handle:hover .handle-track,
    .side-handle:active .handle-track {
      background: rgba(0, 95, 115, 0.12);
    }

    .handle-line {
      display: block;
      height: 2px;
      background: var(--muted);
      border-radius: 99px;
      transition: background-color 0.15s ease, width 0.15s ease;
    }

    .handle-line:nth-child(1) {
      width: 22px;
    }

    .handle-line:nth-child(2) {
      width: 26px;
    }

    .handle-line:nth-child(3) {
      width: 22px;
    }

    .side-handle:hover .handle-line,
    .side-handle:active .handle-line {
      background: var(--accent);
    }

    .side.is-maximized {
      display: flex;
      flex-direction: column;
      padding: 14px 13px 6px;
      gap: 0;
      border-top-width: 4px;
      box-shadow: 0 3px 14px rgba(23, 32, 39, 0.1);
    }

    .side.is-maximized .brand {
      gap: 10px;
      overflow: visible;
    }

    .side.is-maximized .brand h1 {
      font-size: 16px;
      line-height: 1.2;
      white-space: normal;
    }

    .side.is-maximized .intro {
      display: block;
      margin: 12px 0 0;
      padding-top: 12px;
      border-top: 1px solid var(--border);
      font-size: 12px;
      line-height: 1.45;
      color: var(--muted);
    }

    .side.is-maximized .side-bottom {
      display: block;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }

    .side.is-maximized .side-bottom :global(.btn) {
      width: 100%;
      min-height: 36px;
      font-size: 11px;
    }

    .side.is-maximized .side-handle {
      margin-top: 8px;
      padding: 6px 0 2px;
    }
  }
</style>
