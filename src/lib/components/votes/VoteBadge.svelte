<script lang="ts">
  import {
    getVotePresentationClass,
    type DisplayVotePosition
  } from '$lib/components/votes/votePresentation';

  let { vote }: { vote: DisplayVotePosition } = $props();
</script>

<span
  class={`vote-badge ${getVotePresentationClass(vote)}`}
>
  {vote}
</span>

<style>
  .vote-badge {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 0 9px;
    border-width: 1px;
    border-style: solid;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    white-space: nowrap;
    flex-shrink: 0;
    line-height: 1;
  }
</style>
