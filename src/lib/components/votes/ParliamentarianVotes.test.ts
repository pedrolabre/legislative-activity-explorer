import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import {
  officialParliamentarianSessionVotesCoverageMessage,
  officialParliamentarianSessionVotesEmptyMessage,
  officialParliamentarianStaticCoverageDescription,
  officialParliamentarianVoteHistoryUnavailableMessage
} from '$lib/state/chatStore';
import ParliamentarianVotes from './ParliamentarianVotes.svelte';

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
      emptyTitle: officialParliamentarianSessionVotesEmptyMessage,
      emptyDescription: officialParliamentarianStaticCoverageDescription
    });

    expect(html).toContain(officialParliamentarianSessionVotesEmptyMessage);
    expect(html).toContain(officialParliamentarianVoteHistoryUnavailableMessage);
    expect(html).toContain(officialParliamentarianStaticCoverageDescription);
    expect(html).toContain('Voltar ao perfil');
    expect(html).toContain('Nova consulta');
    expect(html).not.toContain('Não há votações associadas nesta visualização.');
    expect(html).not.toContain('Nenhuma votação associada foi retornada pela fonte consultada.');
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
    expect(html).toContain('1 votação disponível');
    expect(html).toContain('Votação nominal oficial.');
    expect(html).toContain('SIM');
  });

  it('renders compact vote row with proposal identification, description, metadata and action button', () => {
    const html = renderParliamentarianVotes({
      parliamentarianName: 'Erika Hilton',
      votes: [
        {
          id: 'v2630',
          parliamentarianId: 'hilton',
          billIdentification: 'PL 2630/2020',
          chamber: 'Câmara dos Deputados',
          description: 'Requerimento de urgência da matéria.',
          officialResult: 'Aprovado',
          parliamentarianVote: 'SIM',
          votedAt: '2024-06-12',
          individualVotes: []
        },
        {
          id: 'vh1',
          parliamentarianId: 'hilton',
          billIdentification: 'PLP 19/2023',
          chamber: 'Câmara dos Deputados',
          description: 'Votação nominal em sessão plenária.',
          officialResult: 'Rejeitado',
          parliamentarianVoteNotice: 'Voto individual não localizado.',
          votedAt: '2024-06-20',
          individualVotes: []
        }
      ]
    });

    expect(html).toContain('2 votações disponíveis');
    expect(html).toContain('PL 2630/2020');
    expect(html).toContain('Requerimento de urgência da matéria.');
    expect(html).toContain('Aprovado');
    expect(html).toContain('PLP 19/2023');
    expect(html).toContain('Votação nominal em sessão plenária.');
    expect(html).toContain('Rejeitado');
    expect(html).toContain('Voto individual não localizado.');
    expect(html).toContain('aria-label="Ver votação de PL 2630/2020"');
    expect(html).toContain('aria-label="Ver votação de PLP 19/2023"');
    expect(html).toContain('Ver votação');
    expect(html).toContain('Voltar ao perfil');
    expect(html).toContain('Nova consulta');
  });
});
