<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    headingId = 'conversation-log-title',
    children
  }: {
    title: string;
    headingId?: string;
    children: Snippet;
  } = $props();
</script>

<section class="flex min-h-[22rem] w-full min-w-0 flex-col" aria-labelledby={headingId}>
  <h2 id={headingId} class="sr-only">{title}</h2>
  <div
    role="log"
    aria-live="polite"
    aria-relevant="additions text"
    aria-atomic="false"
    aria-labelledby={headingId}
    class="flex min-w-0 flex-1 flex-col gap-4 rounded-ui border border-border bg-surface-muted p-4 sm:p-6"
  >
    {@render children()}
  </div>
</section>
