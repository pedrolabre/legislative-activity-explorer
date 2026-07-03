import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import ParliamentarianDetail from './ParliamentarianDetail.svelte';

function renderParliamentarianDetail(overrides = {}) {
  return render(ParliamentarianDetail, {
    props: {
      parliamentarian: {
        id: 'camara-10',
        name: 'Ana Costa',
        office: 'Deputado federal',
        chamber: 'Câmara dos Deputados',
        party: 'ABC',
        state: 'MG',
        status: 'Em exercício',
        ...overrides
      },
      onOpenBills: () => undefined,
      onOpenVotes: () => undefined,
      onBackToResults: () => undefined,
      onStartOver: () => undefined
    }
  }).body;
}

describe('ParliamentarianDetail', () => {
  it('uses specific availability messages for missing profile fields', () => {
    const html = renderParliamentarianDetail({
      fullName: undefined,
      term: undefined,
      email: undefined,
      photoUrl: undefined
    });

    expect(html).toContain('Não informado pela fonte oficial consultada.');
    expect(html).toContain('Foto não informada pela fonte oficial consultada para Ana Costa');
    expect(html).toContain('Votações disponíveis');
    expect(html).toContain('Abrir votos oficiais já disponíveis nesta consulta.');
    expect(html).not.toContain('>Mandato</dt>');
  });
  it('uses the provided term label for legislature data', () => {
    const html = renderParliamentarianDetail({
      term: 'Legislatura 57',
      termLabel: 'Legislatura'
    });

    expect(html).toContain('>Legislatura</dt>');
    expect(html).toContain('Legislatura 57');
    expect(html).not.toContain('>Mandato</dt>');
  });
});
