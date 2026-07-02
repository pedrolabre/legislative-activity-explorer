import { describe, expect, it } from 'vitest';
import { CamaraMapperError } from './camaraMapper';
import {
  mapCamaraDeputadoToParliamentarian,
  mapCamaraProposicaoTemasToSubject,
  mapCamaraProposicaoToLegislativeProposal,
  mapCamaraProposicoesToLegislativeProposals,
  mapCamaraVotacaoToRollCallVote,
  mapCamaraVotosToIndividualVotes
} from './camaraMapper';

describe('mapCamaraDeputadoToParliamentarian', () => {
  it('normalizes a complete Camara deputy payload to the domain contract', () => {
    const parliamentarian = mapCamaraDeputadoToParliamentarian({
      id: 204556,
      nomeCivil: 'Pedro Luis Silva',
      siglaPartido: 'OLD',
      siglaUf: 'RJ',
      idLegislatura: 56,
      urlFoto: 'https://camara.example/foto-antiga.jpg',
      email: 'dep.antigo@camara.leg.br',
      ultimoStatus: {
        nomeEleitoral: 'Pedro Silva',
        siglaPartido: 'XYZ',
        siglaUf: 'SP',
        idLegislatura: 57,
        urlFoto: 'https://camara.example/foto.jpg',
        email: 'dep.pedrosilva@camara.leg.br',
        gabinete: {
          email: 'gabinete.pedrosilva@camara.leg.br'
        },
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
      term: 'Legislatura 57',
      termLabel: 'Legislatura',
      status: 'Exercício',
      photoUrl: 'https://camara.example/foto.jpg',
      email: 'gabinete.pedrosilva@camara.leg.br',
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
    expect(parliamentarian.term).toBeUndefined();
    expect(parliamentarian.termLabel).toBeUndefined();
  });

  it('normalizes simplified deputy payloads returned by Camara lists', () => {
    const parliamentarian = mapCamaraDeputadoToParliamentarian({
      id: 30,
      nome: 'Ana Costa',
      siglaPartido: 'ABC',
      siglaUf: 'MG',
      idLegislatura: 57,
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
      term: 'Legislatura 57',
      termLabel: 'Legislatura',
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
      urlInteiroTeor: 'https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=9876',
      statusProposicao: {
        descricaoSituacao: 'Aguardando parecer',
        descricaoTramitacao: 'Aguardando designação de relator',
        regime: 'Ordinária'
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
      currentStage: 'Aguardando designação de relator',
      presentedAt: '2024-03-15',
      officialSummary: 'Altera a legislação federal sobre transparência de dados públicos.',
      officialUrl: 'https://www.camara.leg.br/propostas-legislativas/9876',
      officialFullTextUrl:
        'https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=9876',
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
    expect(proposal.currentStage).toBeUndefined();
    expect(proposal.presentedAt).toBeUndefined();
    expect(proposal.officialSummary).toBeUndefined();
    expect(proposal.officialFullTextUrl).toBeUndefined();
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

  it('does not use procedural regime as official situation', () => {
    const proposal = mapCamaraProposicaoToLegislativeProposal({
      id: 301,
      siglaTipo: 'PL',
      numero: 3,
      ano: 2024,
      urlInteiroTeor: 'javascript:alert(1)',
      statusProposicao: {
        regime: 'Urgência',
        despacho: 'Aguardando despacho do Presidente da Câmara.'
      }
    });

    expect(proposal.status).toBeUndefined();
    expect(proposal.currentStage).toBe('Aguardando despacho do Presidente da Câmara.');
    expect(proposal.officialFullTextUrl).toBeUndefined();
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

describe('mapCamaraVotacaoToRollCallVote', () => {
  it('normalizes an official Camara vote to the domain contract', () => {
    const vote = mapCamaraVotacaoToRollCallVote(
      {
        id: '9876-1',
        data: '2024-06-12',
        dataHoraRegistro: '2024-06-12T18:30:00',
        descricao: 'Votacao nominal do texto-base.',
        resultado: 'Aprovado'
      },
      {
        proposalIdentification: 'PL 2/2024',
        individualVotes: [
          {
            parliamentarianId: 'camara-10',
            parliamentarianName: 'Ana Costa',
            party: 'ABC',
            state: 'MG',
            vote: 'SIM'
          }
        ]
      }
    );

    expect(vote).toEqual({
      id: 'camara-votacao-9876-1',
      source: 'camara',
      sourceId: '9876-1',
      proposalId: 'PL 2/2024',
      votedAt: '2024-06-12',
      description: 'Votacao nominal do texto-base.',
      result: 'Aprovado',
      individualVotes: [
        {
          parliamentarianId: 'camara-10',
          parliamentarianName: 'Ana Costa',
          party: 'ABC',
          state: 'MG',
          vote: 'SIM'
        }
      ]
    });
  });

  it('keeps non textual approval flags out of the official result field', () => {
    const vote = mapCamaraVotacaoToRollCallVote(
      {
        id: '9876-1',
        descricao: 'Votacao nominal.',
        aprovacao: true
      },
      {
        proposalIdentification: 'PL 2/2024'
      }
    );

    expect(vote.result).toBeUndefined();
  });

  it('does not infer an official result from free text descriptions', () => {
    const vote = mapCamaraVotacaoToRollCallVote(
      {
        id: '9876-2',
        descricao: 'Aprovado o texto-base em votação nominal.'
      },
      {
        proposalIdentification: 'PL 2/2024'
      }
    );

    expect(vote.description).toBe('Aprovado o texto-base em votação nominal.');
    expect(vote.result).toBeUndefined();
  });

  it('represents a missing vote id as a mapper error', () => {
    expect(() =>
      mapCamaraVotacaoToRollCallVote(
        {
          descricao: 'Sem id.'
        },
        {
          proposalIdentification: 'PL 2/2024'
        }
      )
    ).toThrow(CamaraMapperError);
  });
});

describe('mapCamaraVotosToIndividualVotes', () => {
  it('normalizes recognized official individual vote labels', () => {
    expect(
      mapCamaraVotosToIndividualVotes([
        {
          tipoVoto: 'Sim',
          deputado_: {
            id: 10,
            nome: 'Ana Costa',
            siglaPartido: 'ABC',
            siglaUf: 'MG'
          }
        },
        {
          tipoVoto: 'Nao',
          deputado_: {
            id: 11,
            nome: 'Bruno Ribeiro',
            siglaPartido: 'XYZ',
            siglaUf: 'SP'
          }
        },
        {
          tipoVoto: 'Abstencao',
          deputado_: {
            id: 12,
            nome: 'Carla Lima'
          }
        },
        {
          tipoVoto: 'Ausente',
          deputado_: {
            id: 13,
            nome: 'Diego Souza'
          }
        }
      ])
    ).toEqual([
      {
        parliamentarianId: 'camara-10',
        parliamentarianName: 'Ana Costa',
        party: 'ABC',
        state: 'MG',
        vote: 'SIM'
      },
      {
        parliamentarianId: 'camara-11',
        parliamentarianName: 'Bruno Ribeiro',
        party: 'XYZ',
        state: 'SP',
        vote: 'NAO'
      },
      {
        parliamentarianId: 'camara-12',
        parliamentarianName: 'Carla Lima',
        party: undefined,
        state: undefined,
        vote: 'ABSTENCAO'
      },
      {
        parliamentarianId: 'camara-13',
        parliamentarianName: 'Diego Souza',
        party: undefined,
        state: undefined,
        vote: 'AUSENTE'
      }
    ]);
  });

  it('does not infer unsupported or incomplete individual votes', () => {
    expect(
      mapCamaraVotosToIndividualVotes([
        {
          tipoVoto: 'Obstrucao',
          deputado_: {
            id: 10,
            nome: 'Ana Costa'
          }
        },
        {
          tipoVoto: 'Artigo 17',
          deputado_: {
            id: 14,
            nome: 'Diego Souza'
          }
        },
        {
          tipoVoto: 'Sim',
          deputado_: {
            id: 11,
            nome: ''
          }
        },
        {
          tipoVoto: null,
          deputado_: {
            id: 12,
            nome: 'Carla Lima'
          }
        }
      ])
    ).toEqual([]);
  });
});
