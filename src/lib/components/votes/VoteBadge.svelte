<script lang="ts">
  import type { VotePosition } from '$lib/data/parliamentarianVoteFixtures';

  let { vote }: { vote: VotePosition } = $props();

  function getVoteClass(currentVote: VotePosition) {
    if (currentVote === 'SIM') {
      return 'border-[#2f5d7c] bg-[#e9f1f6] text-[#203f55]';
    }

    if (currentVote === 'NÃO') {
      return 'border-[#6b5b7a] bg-[#f1eef5] text-[#493f56]';
    }

    if (currentVote === 'ABSTENÇÃO') {
      return 'border-[#8a6f2a] bg-[#fbf3d5] text-[#5d4b1c]';
    }

    return 'border-border bg-surface-muted text-ink-muted';
  }
</script>

<span
  class={`inline-flex min-h-8 items-center rounded-ui border px-3 py-1 text-xs font-bold uppercase leading-5 tracking-normal ${getVoteClass(vote)}`}
>
  {vote}
</span>
