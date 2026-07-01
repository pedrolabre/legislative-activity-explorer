import { describe, expect, it } from 'vitest';
import { CamaraMapperError } from './camaraMapper';
import {
  mapCamaraDeputadoToParliamentarian,
  mapCamaraProposicaoTemasToSubject,
  mapCamaraProposicaoToLegislativeProposal,
  mapCamaraProposicoesToLegislativeProposals
} from './camaraMapper';

describe('mapCamaraDeputadoToParliamentarian', () => {
  it('normalizes a complete Camara deputy payload to the domain contract', () => {
    const parliamentarian = mapCamaraDeputadoToParliamentarian({
      id: 204556,
      nomeCivil: 'Pedro Luis Silva',
      ultimoStatus: {
        nomeEleitoral: 'Pedro Silva',
        siglaPartido: 'XYZ',
        siglaUf: 'SP',
        urlFoto: 'https://camara.example/foto.jpg',
        email: 'dep.pedrosilva@camara.leg.br',
        situacao: 'Exercício'
      }
    });

    expect(parliamentarian).toEqual({
      id: 'camara-204556',
      source: 'camara',
      sourceId: '204556',
      name: 'Pedro Silva',
      fullName: 'Pedro Luis Silva',
      office: 'Deputado federal',
      party: 'XYZ',
      state: 'SP',
      status: 'Exercício',
      photoUrl: 'https://camara.example/foto.jpg',
      email: 'dep.pedrosilva@camara.leg.br',
      officialUrl: 'https://www.camara.leg.br/deputados/204556'
    });
  });

  it('keeps missing optional deputy fields undefined', () => {
    const parliamentarian = mapCamaraDeputadoToParliamentarian({
      id: '10',
      nomeCivil: null,
      ultimoStatus: {
        nomeEleitoral: null,
        nome: null,
        siglaPartido: '',
        siglaUf: null,
        urlFoto: null,
        email: undefined,
        situacao: null
      }
    });

    expect(parliamentarian).toMatchObject({
      id: 'camara-10',
      sourceId: '10',
      name: 'Deputado federal 10',
      office: 'Deputado federal',
      officialUrl: 'https://www.camara.leg.br/deputados/10'
    });
    expect(parliamentarian.fullName).toBeUndefined();
    expect(parliamentarian.party).toBeUndefined();
    expect(parliamentarian.state).toBeUndefined();
    expect(parliamentarian.photoUrl).toBeUndefined();
    expect(parliamentarian.email).toBeUndefined();
    expect(parliamentarian.status).toBeUndefined();
  });

  it('normalizes simplified deputy payloads returned by Camara lists', () => {
    const parliamentarian = mapCamaraDeputadoToParliamentarian({
      id: 30,
      nome: 'Ana Costa',
      siglaPartido: 'ABC',
      siglaUf: 'MG',
      urlFoto: 'https://camara.example/ana.jpg',
      email: 'dep.anacosta@camara.leg.br'
    });

    expect(parliamentarian).toMatchObject({
      id: 'camara-30',
      source: 'camara',
      sourceId: '30',
      name: 'Ana Costa',
      office: 'Deputado federal',
      party: 'ABC',
      state: 'MG',
      photoUrl: 'https://camara.example/ana.jpg',
      email: 'dep.anacosta@camara.leg.br',
      officialUrl: 'https://www.camara.leg.br/deputados/30'
    });
  });

  it('represents a missing deputy id as a mapper error', () => {
    expect(() => mapCamaraDeputadoToParliamentarian({ nomeCivil: 'Sem id' })).toThrow(
      CamaraMapperError
    );
  });
});

describe('mapCamaraProposicaoToLegislativeProposal', () => {
  it('normalizes a complete Camara proposition payload to the domain contract', () => {
    const proposal = mapCamaraProposicaoToLegislativeProposal({
      id: 9876,
      siglaTipo: 'PL',
      descricaoTipo: 'Projeto de Lei',
      numero: 1234,
      ano: 2024,
      ementa: 'Altera a legislação federal sobre transparência de dados públicos.',
      dataApresentacao: '2024-03-15T10:30:00',
      statusProposicao: {
        descricaoSituacao: 'Aguardando parecer'
      }
    });

    expect(proposal).toEqual({
      id: 'camara-proposicao-9876',
      source: 'camara',
      sourceId: '9876',
      title: 'PL 1234/2024',
      type: 'PL',
      number: '1234',
      year: 2024,
      status: 'Aguardando parecer',
      presentedAt: '2024-03-15',
      officialSummary: 'Altera a legislação federal sobre transparência de dados públicos.',
      officialUrl: 'https://www.camara.leg.br/propostas-legislativas/9876',
      references: [
        {
          id: 'camara-proposicao-9876-fonte-oficial',
          type: 'official',
          title: 'Página oficial da proposição',
          publisher: 'Câmara dos Deputados',
          url: 'https://www.camara.leg.br/propostas-legislativas/9876'
        }
      ]
    });
  });

  it('keeps missing optional proposition fields undefined and preserves references', () => {
    const proposal = mapCamaraProposicaoToLegislativeProposal({
      id: '300',
      siglaTipo: null,
      numero: null,
      ano: null,
      ementa: '',
      statusProposicao: null
    });

    expect(proposal).toMatchObject({
      id: 'camara-proposicao-300',
      sourceId: '300',
      title: 'Proposição 300',
      type: 'Proposição',
      officialUrl: 'https://www.camara.leg.br/propostas-legislativas/300'
    });
    expect(proposal.number).toBeUndefined();
    expect(proposal.year).toBeUndefined();
    expect(proposal.status).toBeUndefined();
    expect(proposal.presentedAt).toBeUndefined();
    expect(proposal.officialSummary).toBeUndefined();
    expect(proposal.references).toEqual([
      {
        id: 'camara-proposicao-300-fonte-oficial',
        type: 'official',
        title: 'Página oficial da proposição',
        publisher: 'Câmara dos Deputados',
        url: 'https://www.camara.leg.br/propostas-legislativas/300'
      }
    ]);
  });

  it('normalizes a list of Camara proposition payloads', () => {
    expect(
      mapCamaraProposicoesToLegislativeProposals([
        {
          id: 1,
          siglaTipo: 'PL',
          numero: 10,
          ano: 2024
        },
        {
          id: 2,
          siglaTipo: 'PEC',
          numero: 45,
          ano: 2023
        }
      ]).map((proposal) => proposal.title)
    ).toEqual(['PL 10/2024', 'PEC 45/2023']);
  });

  it('represents a missing proposition id as a mapper error', () => {
    expect(() => mapCamaraProposicaoToLegislativeProposal({ siglaTipo: 'PL' })).toThrow(
      CamaraMapperError
    );
  });
});

describe('mapCamaraProposicaoTemasToSubject', () => {
  it('joins official Camara proposition themes without inventing labels', () => {
    expect(
      mapCamaraProposicaoTemasToSubject([
        {
          codTema: 40,
          tema: 'Educacao'
        },
        {
          codTema: 60,
          tema: 'Saude'
        }
      ])
    ).toBe('Educacao; Saude');
  });

  it('ignores empty and duplicated theme labels', () => {
    expect(
      mapCamaraProposicaoTemasToSubject([
        {
          codTema: 40,
          tema: 'Educacao'
        },
        {
          codTema: 40,
          tema: ' educacao '
        },
        {
          codTema: 90,
          tema: ''
        }
      ])
    ).toBe('Educacao');
  });

  it('keeps subject unavailable when no official theme label is present', () => {
    expect(
      mapCamaraProposicaoTemasToSubject([
        {
          codTema: 90,
          tema: ''
        }
      ])
    ).toBeUndefined();
  });
});
