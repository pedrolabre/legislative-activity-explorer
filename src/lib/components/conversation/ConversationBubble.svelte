<script lang="ts">
  import type { Snippet } from 'svelte';

  type ConversationTone = 'system' | 'user' | 'status';

  let { tone = 'system', children }: { tone?: ConversationTone; children: Snippet } = $props();

  function getToneClass(currentTone: ConversationTone) {
    if (currentTone === 'user') {
      return 'self-end bg-accent-strong text-white';
    }

    if (currentTone === 'status') {
      return 'self-start border border-civic bg-[#fff8e1] text-ink';
    }

    return 'self-start border border-border bg-surface-raised text-ink';
  }
</script>

<div
  class={`max-w-[min(100%,38rem)] [overflow-wrap:anywhere] rounded-ui px-4 py-3 text-sm leading-6 shadow-sm sm:px-5 sm:py-4 sm:text-base ${getToneClass(tone)}`}
>
  {@render children()}
</div>
