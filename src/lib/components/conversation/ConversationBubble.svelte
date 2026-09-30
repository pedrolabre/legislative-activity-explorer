<script lang="ts">
  import type { Snippet } from 'svelte';

  type ConversationTone = 'system' | 'user' | 'status';

  let { tone = 'system', children }: { tone?: ConversationTone; children: Snippet } = $props();
</script>

{#if tone === 'user'}
  <div class="context">
    <div class="bubble-user">
      {@render children()}
    </div>
  </div>
{:else if tone === 'status'}
  <section class="answer white">
    <div class="content">
      {@render children()}
    </div>
  </section>
{:else}
  <section class="answer">
    <div class="content">
      {@render children()}
    </div>
  </section>
{/if}

<style>
  .context {
    display: flex;
    justify-content: flex-end;
  }

  .bubble-user {
    max-width: 55%;
    background: var(--accent2);
    color: #ffffff;
    border-radius: 9px 9px 2px 9px;
    padding: 7px 11px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  }

  :global(.bubble-user small) {
    display: block;
    font-size: 8px;
    text-transform: uppercase;
    font-weight: 800;
    opacity: 0.78;
  }

  :global(.bubble-user strong) {
    display: block;
    margin-top: 2px;
    font-size: 11px;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .answer {
    min-height: 0;
    background: var(--cream);
    border: 1px solid var(--gold);
    border-radius: 9px 9px 9px 2px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
  }

  .answer.white {
    background: #ffffff;
    border-color: var(--border);
  }

  .content {
    min-height: 0;
    flex: 1;
    margin-top: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 2px;
    display: flex;
    flex-direction: column;
  }
</style>
