<script lang="ts">
  import type { Snippet } from 'svelte';

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
  class="flex min-h-[16rem] w-full min-w-0 flex-col sm:min-h-[17rem] lg:min-h-[22rem]"
  aria-labelledby={headingId}
>
  <h2 id={headingId} class="sr-only">{title}</h2>
  <div
    role="log"
    aria-live="polite"
    aria-relevant="additions text"
    aria-atomic="false"
    aria-busy={busy ? 'true' : undefined}
    aria-labelledby={headingId}
    class="flex min-w-0 flex-1 flex-col gap-3 rounded-ui border border-border bg-surface-muted p-3 sm:p-4"
  >
    {@render children()}
  </div>
</section>
