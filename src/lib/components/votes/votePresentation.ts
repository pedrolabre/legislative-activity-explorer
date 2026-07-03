import type { DisplayVotePosition } from '$lib/domain';
export { DISPLAY_VOTE_POSITIONS, type DisplayVotePosition } from '$lib/domain';

export const votePresentationClassByPosition: Record<DisplayVotePosition, string> = {
  SIM: 'border-[#2f5d7c] bg-[#e9f1f6] text-[#203f55]',
  NÃO: 'border-[#6b5b7a] bg-[#f1eef5] text-[#493f56]',
  ABSTENÇÃO: 'border-[#8a6f2a] bg-[#fbf3d5] text-[#5d4b1c]',
  AUSENTE: 'border-border bg-surface-muted text-ink-muted'
};

export function getVotePresentationClass(vote: DisplayVotePosition) {
  return votePresentationClassByPosition[vote];
}
