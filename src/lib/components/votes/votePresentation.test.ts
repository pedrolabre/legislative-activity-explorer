import { describe, expect, it } from 'vitest';
import {
  DISPLAY_VOTE_POSITIONS,
  getVotePresentationClass,
  votePresentationClassByPosition
} from './votePresentation';

const forbiddenValueColorTokens = [
  'green',
  'red',
  'emerald',
  'lime',
  'rose',
  'verde',
  'vermelho',
  'vermelha'
];

describe('votePresentation', () => {
  it('keeps the visible vote labels restricted to official positions', () => {
    expect(DISPLAY_VOTE_POSITIONS).toEqual(['SIM', 'NÃO', 'ABSTENÇÃO', 'AUSENTE']);
  });

  it('keeps audited neutral color classes for each vote position', () => {
    expect(votePresentationClassByPosition).toEqual({
      SIM: 'border-[#2f5d7c] bg-[#e9f1f6] text-[#203f55]',
      NÃO: 'border-[#6b5b7a] bg-[#f1eef5] text-[#493f56]',
      ABSTENÇÃO: 'border-[#8a6f2a] bg-[#fbf3d5] text-[#5d4b1c]',
      AUSENTE: 'border-border bg-surface-muted text-ink-muted'
    });
  });

  it('does not use green or red vote color tokens', () => {
    for (const vote of DISPLAY_VOTE_POSITIONS) {
      const className = getVotePresentationClass(vote).toLocaleLowerCase('pt-BR');

      for (const token of forbiddenValueColorTokens) {
        expect(className).not.toContain(token);
      }
    }
  });
});
