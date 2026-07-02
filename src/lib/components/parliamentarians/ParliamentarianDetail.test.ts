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
    expect(html).toContain('Ainda não conectado nesta versão.');
    expect(html).toContain('Foto não informada pela fonte oficial consultada para Ana Costa');
  });
});
