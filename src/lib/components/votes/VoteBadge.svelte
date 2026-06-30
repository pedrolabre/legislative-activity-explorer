<script lang="ts">
  import {
    getVotePresentationClass,
    type DisplayVotePosition
  } from '$lib/components/votes/votePresentation';

  let { vote }: { vote: DisplayVotePosition } = $props();
</script>

<span
  class={`inline-flex min-h-8 items-center rounded-ui border px-3 py-1 text-xs font-bold uppercase leading-5 tracking-normal ${getVotePresentationClass(vote)}`}
>
  {vote}
</span>
