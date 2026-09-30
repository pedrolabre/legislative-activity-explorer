<script lang="ts">
  import type { Snippet } from 'svelte';
  import ProductLogo from '$lib/components/brand/ProductLogo.svelte';

  let {
    title,
    headingId = 'conversation-log-title',
    busy = false,
    children
  }: {
    title: string;
    headingId?: string;
    busy?: boolean;
    children: Snippet;
  } = $props();
</script>

<section
  class="chat"
  aria-labelledby={headingId}
>
  <h2 id={headingId} class="sr-only">{title}</h2>
  <header class="chat-head">
    <div class="chat-head-left">
      <ProductLogo size="sm" showText={false} label="O que o parlamentar fez" />
      <p class="chat-kicker">Consulta pública</p>
    </div>
  </header>

  <div
    role="log"
    aria-live="polite"
    aria-relevant="additions text"
    aria-atomic="false"
    aria-busy={busy ? 'true' : undefined}
    aria-labelledby={headingId}
    class="stage"
  >
    {@render children()}
  </div>
</section>

<style>
  .chat {
    background: var(--panel);
    display: grid;
    grid-template-rows: 54px 1fr;
    overflow: hidden;
    min-height: 0;
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(23, 32, 39, 0.06);
  }

  .chat-head {
    display: flex;
    align-items: center;
    padding: 0 16px;
    background: rgba(255, 255, 255, 0.72);
    border-bottom: 1px solid var(--border);
  }

  .chat-head-left {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .chat-kicker {
    margin: 0;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--muted);
    letter-spacing: 0.02em;
  }

  .stage {
    min-height: 0;
    padding: 14px 16px;
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 10px;
    overflow: hidden;
  }

  @media (max-width: 700px) {
    .chat {
      grid-template-rows: 45px 1fr;
    }

    .stage {
      padding: 9px;
    }
  }
</style>
