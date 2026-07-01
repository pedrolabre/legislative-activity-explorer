import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import {
  officialParliamentarianSessionVotesCoverageMessage,
  officialParliamentarianVoteHistoryUnavailableMessage
} from '$lib/state/chatStore';
import ParliamentarianVotes from './ParliamentarianVotes.svelte';

const officialStaticCoverageDescription =
  'Esta versão estática não varre anos, proposições, votações ou arquivos grandes para montar esse histórico.';

function renderParliamentarianVotes(propOverrides = {}) {
  return render(ParliamentarianVotes, {
    props: {
      parliamentarianName: 'Ana Costa',
      votes: [],
      onSelectVote: () => undefined,
      onBackToParliamentarian: () => undefined,
      onStartOver: () => undefined,
      ...propOverrides
    }
  }).body;
}

describe('ParliamentarianVotes', () => {
  it('renders a specific empty state for official parliamentarian vote coverage', () => {
    const html = renderParliamentarianVotes({
      emptyTitle: officialParliamentarianVoteHistoryUnavailableMessage,
      emptyDescription: officialStaticCoverageDescription
    });

    expect(html).toContain(officialParliamentarianVoteHistoryUnavailableMessage);
    expect(html).toContain(officialStaticCoverageDescription);
    expect(html).not.toContain('Não há votações associadas nesta visualização.');
  });

  it('renders session partial coverage when official proposal votes are available', () => {
    const html = renderParliamentarianVotes({
      coverageDescription: officialParliamentarianSessionVotesCoverageMessage,
      votes: [
        {
          id: 'camara-votacao-100-1',
          parliamentarianId: 'camara-10',
          billIdentification: 'PL 2/2024',
          chamber: 'Câmara dos Deputados',
          description: 'Votação nominal oficial.',
          parliamentarianVote: 'SIM',
          votedAt: '2024-06-12',
          individualVotes: []
        }
      ]
    });

    expect(html).toContain(officialParliamentarianSessionVotesCoverageMessage);
    expect(html).toContain('1 votação associada');
    expect(html).toContain('Votação nominal oficial.');
    expect(html).toContain('SIM');
  });
});
