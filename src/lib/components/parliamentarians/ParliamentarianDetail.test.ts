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

  it('renders the two-column profile layout conforming to the redesign structure', () => {
    const html = renderParliamentarianDetail({
      fullName: 'Ana Luiza Costa',
      term: 'Legislatura 57',
      email: 'dep.anacosta@camara.leg.br'
    });

    expect(html).toMatch(/class="[^"]*\bprofile\b[^"]*"/);
    expect(html).toMatch(/class="[^"]*\bprofile-left\b[^"]*"/);
    expect(html).toMatch(/class="[^"]*\bprofile-main\b[^"]*"/);
    expect(html).toMatch(/<h2[^>]*class="[^"]*\bname\b[^"]*"[^>]*>\s*Ana Costa\s*<\/h2>/);
    expect(html).toMatch(/class="[^"]*\bidentity\b[^"]*"/);
    expect(html).toContain('Deputado federal · ABC · MG · Legislatura 57');
    expect(html).toMatch(/class="[^"]*\bfacts\b[^"]*"/);
    expect(html).toContain('Nome civil');
    expect(html).toContain('Ana Luiza Costa');
    expect(html).toContain('Casa');
    expect(html).toContain('Câmara dos Deputados');
    expect(html).toContain('E-mail');
    expect(html).toContain('dep.anacosta@camara.leg.br');
    expect(html).toContain('Nova consulta');
    expect(html).toContain('← Voltar aos resultados');
    expect(html).toMatch(/class="[^"]*\bactions\b[^"]*"/);
    expect(html).toContain('Proposições do parlamentar');
    expect(html).toContain('Votações disponíveis');
    expect(html).toContain('Abrir proposições');
    expect(html).toContain('Abrir votações');
  });

  it('renders official photo with 78x78 dimensions when photoUrl is available', () => {
    const html = renderParliamentarianDetail({
      photoUrl: 'https://example.com/foto.jpg'
    });

    expect(html).toContain('src="https://example.com/foto.jpg"');
    expect(html).toContain('width="78"');
    expect(html).toContain('height="78"');
    expect(html).toMatch(/class="[^"]*\bphoto\b[^"]*"/);
  });
});
