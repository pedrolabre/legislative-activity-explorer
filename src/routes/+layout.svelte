<script lang="ts">
  import type { Snippet } from 'svelte';
  import '../app.css';

  let { children }: { children: Snippet } = $props();
</script>

<a class="skip-link" href="#conteudo">Ir para o conteúdo</a>

{@render children()}
