import { describe, expect, it, vi } from 'vitest';
import { CamaraApiClientError } from '$lib/api/camaraClient';
import { SenadoApiClientError } from '$lib/api/senadoClient';
import {
  getOfficialParliamentarianDetail,
  getOfficialProposalDetail,
  getOfficialProposalsByParliamentarian,
  type OfficialCamaraDetailClient,
  type OfficialSenadoDetailClient
} from './officialDetailService';

function createEmptyCamaraClient(): OfficialCamaraDetailClient {
  return {
    getDeputadoById: async () => ({
      id: 10
    }),
    getProposicoesByDeputadoAutor: async () => [],
    getProposicaoById: async () => ({
      id: 100
    }),
    getProposicaoTemasById: async () => []
  };
}

function createEmptySenadoClient(): OfficialSenadoDetailClient {
  return {
    getSenadorById: async () => ({
      IdentificacaoParlamentar: {
        CodigoParlamentar: '20'
      }
    }),
    getSenadorMandatosById: async () => [],
    getProcessoById: async () => ({
      id: '9046221',
      codigoMateria: '174108'
    }),
    getMateriaById: async () => ({
      IdentificacaoMateria: {
        CodigoMateria: '300'
      }
    }),
    searchProcessos: async () => [],
    searchRelatorias: async () => []
  };
}

describe('getOfficialParliamentarianDetail', () => {
  it('loads and maps a Camara deputy detail by official source id', async () => {
    let requestedId: string | number | undefined;
    const camaraClient: OfficialCamaraDetailClient = {
      ...createEmptyCamaraClient(),
      getDeputadoById: async (id) => {
        requestedId = id;
        return {
          id: 10,
          nomeCivil: 'Ana Costa Pereira',
          ultimoStatus: {
            nomeEleitoral: 'Ana Costa',
            siglaPartido: 'ABC',
            siglaUf: 'MG',
            idLegislatura: 57,
            gabinete: {
              email: 'gabinete.ana@camara.leg.br'
            }
          }
        };
      }
    };

    const result = await getOfficialParliamentarianDetail(
      {
        id: 'camara-10',
        source: 'camara',
        sourceId: '10',
        name: 'Ana Costa',
        office: 'Deputado federal'
      },
      {
        camaraClient,
        senadoClient: createEmptySenadoClient()
      }
    );

    expect(requestedId).toBe('10');
    expect(result).toMatchObject({
      status: 'fulfilled',
      data: {
        id: 'camara-10',
        fullName: 'Ana Costa Pereira',
        party: 'ABC',
        state: 'MG',
        term: 'Legislatura 57',
        termLabel: 'Legislatura',
        email: 'gabinete.ana@camara.leg.br'
      },
      errors: []
    });
  });

  it('loads and maps a Senado senator detail by official source id', async () => {
    const result = await getOfficialParliamentarianDetail(
      {
        id: 'senado-20',
        source: 'senado',
        sourceId: '20',
        name: 'Maria Souza',
        office: 'Senador'
      },
      {
        camaraClient: createEmptyCamaraClient(),
        senadoClient: {
          ...createEmptySenadoClient(),
          getSenadorById: async () => ({
            IdentificacaoParlamentar: {
              CodigoParlamentar: '20',
              NomeParlamentar: 'Maria Souza',
              NomeCompletoParlamentar: 'Maria Souza Almeida',
              CodigoPublicoNaLegAtual: '700',
              SiglaPartidoParlamentar: 'DEF',
              UfParlamentar: 'SP'
            }
          }),
          getSenadorMandatosById: async () => [
            {
              DescricaoParticipacao: 'Titular',
              PrimeiraLegislaturaDoMandato: {
                DataInicio: '2023-02-01'
              },
              SegundaLegislaturaDoMandato: {
                DataFim: '2031-01-31'
              },
              Exercicios: {
                Exercicio: {
                  DataInicio: '2023-02-01'
                }
              }
            }
          ]
        }
      }
    );

    expect(result).toMatchObject({
      status: 'fulfilled',
      data: {
        id: 'senado-20',
        fullName: 'Maria Souza Almeida',
        party: 'DEF',
        state: 'SP',
        status: undefined,
        term: '2023-02-01 a 2031-01-31',
        termLabel: 'Mandato'
      },
      errors: []
    });
  });

  it('keeps Senado senator detail available when official mandates fail', async () => {
    const result = await getOfficialParliamentarianDetail(
      {
        id: 'senado-20',
        source: 'senado',
        sourceId: '20',
        name: 'Maria Souza',
        office: 'Senador'
      },
      {
        camaraClient: createEmptyCamaraClient(),
        senadoClient: {
          ...createEmptySenadoClient(),
          getSenadorById: async () => ({
            IdentificacaoParlamentar: {
              CodigoParlamentar: '20',
              NomeParlamentar: 'Maria Souza',
              SiglaPartidoParlamentar: 'DEF'
            }
          }),
          getSenadorMandatosById: async () => {
            throw new SenadoApiClientError('A API do Senado retornou uma falha HTTP.', {
              kind: 'http',
              status: 503
            });
          }
        }
      }
    );

    expect(result).toMatchObject({
      status: 'partial',
      data: {
        id: 'senado-20',
        name: 'Maria Souza',
        party: 'DEF'
      },
      errors: [
        {
          source: 'senado',
          entity: 'parliamentarian',
          kind: 'official-unavailable',
          message:
            'A fonte oficial do Senado Federal informou indisponibilidade temporária. A consulta pode ser repetida mais tarde.',
          status: 503
        }
      ]
    });
    expect(result.data?.term).toBeUndefined();
  });

  it('represents client failures as recoverable detail failures', async () => {
    const result = await getOfficialParliamentarianDetail(
      {
        id: 'camara-10',
        source: 'camara',
        sourceId: '10',
        name: 'Ana Costa',
        office: 'Deputado federal'
      },
      {
        camaraClient: {
          ...createEmptyCamaraClient(),
          getDeputadoById: async () => {
            throw new CamaraApiClientError('A API da Camara retornou uma falha HTTP.', {
              kind: 'http',
              status: 503
            });
          }
        },
        senadoClient: createEmptySenadoClient()
      }
    );

    expect(result).toEqual({
      status: 'failed',
      data: null,
      errors: [
        {
          source: 'camara',
          entity: 'parliamentarian',
          kind: 'official-unavailable',
          message:
            'A fonte oficial da Câmara dos Deputados informou indisponibilidade temporária. A consulta pode ser repetida mais tarde.',
          status: 503
        }
      ]
    });
  });
});

describe('getOfficialProposalsByParliamentarian', () => {
  it('loads Camara propositions associated by deputy authorship', async () => {
    let requestedDeputyId: string | number | undefined;
    const result = await getOfficialProposalsByParliamentarian(
      {
        id: 'camara-10',
        source: 'camara',
        sourceId: '10',
        name: 'Ana Costa',
        office: 'Deputado federal'
      },
      {
        camaraClient: {
          ...createEmptyCamaraClient(),
          getProposicoesByDeputadoAutor: async (deputyId) => {
            requestedDeputyId = deputyId;
            return [
              {
                id: 100,
                siglaTipo: 'PL',
                numero: 2,
                ano: 2024,
                ementa: 'Trata de transparencia de dados publicos.'
              }
            ];
          }
        },
        senadoClient: createEmptySenadoClient()
      }
    );

    expect(requestedDeputyId).toBe('10');
    expect(result.status).toBe('fulfilled');
    expect(result.errors).toEqual([]);
    expect(result.data).toEqual([
      expect.objectContaining({
        id: 'camara-proposicao-100',
        title: 'PL 2/2024',
        officialSummary: 'Trata de transparencia de dados publicos.',
        references: [
          {
            id: 'camara-proposicao-100-fonte-oficial',
            type: 'official',
            title: 'Página oficial da proposição',
            publisher: 'Câmara dos Deputados',
            url: 'https://www.camara.leg.br/propostas-legislativas/100'
          }
        ]
      })
    ]);
  });

  it('keeps valid Camara propositions and reports mapper errors as partial data', async () => {
    const result = await getOfficialProposalsByParliamentarian(
      {
        id: 'camara-10',
        source: 'camara',
        sourceId: '10',
        name: 'Ana Costa',
        office: 'Deputado federal'
      },
      {
        camaraClient: {
          ...createEmptyCamaraClient(),
          getProposicoesByDeputadoAutor: async () => [
            {
              siglaTipo: 'PL'
            },
            {
              id: 100,
              siglaTipo: 'PL',
              numero: 2,
              ano: 2024
            }
          ]
        },
        senadoClient: createEmptySenadoClient()
      }
    );

    expect(result.status).toBe('partial');
    expect(result.data.map((proposal) => proposal.id)).toEqual(['camara-proposicao-100']);
    expect(result.errors).toEqual([
      expect.objectContaining({
        source: 'camara',
        entity: 'parliamentarian-proposals',
        kind: 'mapper',
        message:
          'Dados oficiais de proposições associadas da Câmara dos Deputados vieram incompletos nesta consulta.'
      })
    ]);
  });

  it('loads Senado associated matters from modern authorship and rapporteur endpoints', async () => {
    const camaraAuthorLoader = vi.fn(async () => []);
    const senadoAuthorLoader = vi.fn(async () => [
      {
        id: 575578,
        codigoMateria: 123814,
        identificacao: 'PLS 703/2015',
        ementa: 'Altera regras do FGTS.',
        autoria: 'Senador Romario (PSB/RJ)',
        dataApresentacao: '2015-10-28',
        situacaoAtual: 'MATERIA COM A RELATORIA'
      }
    ]);
    const senadoRapporteurLoader = vi.fn(async () => [
      {
        id: 9907428,
        idProcesso: 8751337,
        codigoMateria: 166176,
        identificacaoProcesso: 'PL 4438/2024',
        ementaProcesso: 'Dispensa atletas profissionais de estagio obrigatorio.',
        autoriaProcesso: 'Senadora Leila Barros (PDT/DF)',
        tramitando: 'S',
        descricaoTipoRelator: 'Relator',
        nomeColegiado: 'Comissao de Esporte'
      }
    ]);

    const result = await getOfficialProposalsByParliamentarian(
      {
        id: 'senado-20',
        source: 'senado',
        sourceId: '20',
        name: 'Maria Souza',
        office: 'Senador'
      },
      {
        camaraClient: {
          ...createEmptyCamaraClient(),
          getProposicoesByDeputadoAutor: camaraAuthorLoader
        },
        senadoClient: {
          ...createEmptySenadoClient(),
          searchProcessos: senadoAuthorLoader,
          searchRelatorias: senadoRapporteurLoader
        }
      }
    );

    expect(camaraAuthorLoader).not.toHaveBeenCalled();
    expect(senadoAuthorLoader).toHaveBeenCalledWith({
      codigoParlamentarAutor: '20'
    });
    expect(senadoRapporteurLoader).toHaveBeenCalledWith({
      codigoParlamentar: '20'
    });
    expect(result.status).toBe('fulfilled');
    expect(result.errors).toEqual([]);
    expect(result.data).toEqual([
      expect.objectContaining({
        id: 'senado-processo-8751337',
        title: 'PL 4438/2024',
        relationship: 'Relator',
        authorship: 'Senadora Leila Barros (PDT/DF)'
      }),
      expect.objectContaining({
        id: 'senado-processo-575578',
        title: 'PLS 703/2015',
        relationship: 'Autoria',
        authorship: 'Senador Romario (PSB/RJ)'
      })
    ]);
  });

  it('keeps Senado author records when rapporteur endpoint fails', async () => {
    const result = await getOfficialProposalsByParliamentarian(
      {
        id: 'senado-20',
        source: 'senado',
        sourceId: '20',
        name: 'Maria Souza',
        office: 'Senador'
      },
      {
        camaraClient: createEmptyCamaraClient(),
        senadoClient: {
          ...createEmptySenadoClient(),
          searchProcessos: async () => [
            {
              id: 575578,
              codigoMateria: 123814,
              identificacao: 'PLS 703/2015'
            }
          ],
          searchRelatorias: async () => {
            throw new SenadoApiClientError('A API do Senado retornou uma falha HTTP.', {
              kind: 'http',
              status: 503
            });
          }
        }
      }
    );

    expect(result.status).toBe('partial');
    expect(result.data.map((proposal) => proposal.id)).toEqual(['senado-processo-575578']);
    expect(result.errors).toEqual([
      {
        source: 'senado',
        entity: 'parliamentarian-proposals',
        kind: 'official-unavailable',
        message:
          'A fonte oficial do Senado Federal informou indisponibilidade temporária. A consulta pode ser repetida mais tarde.',
        status: 503
      }
    ]);
  });
});

describe('getOfficialProposalDetail', () => {
  it('loads a Camara proposition detail by official source id', async () => {
    const result = await getOfficialProposalDetail(
      {
        id: 'camara-proposicao-100',
        source: 'camara',
        sourceId: '100',
        title: 'PL 2/2024',
        type: 'PL',
        references: []
      },
      {
        camaraClient: {
          ...createEmptyCamaraClient(),
          getProposicaoById: async () => ({
            id: 100,
            siglaTipo: 'PL',
            numero: 2,
            ano: 2024,
            ementa: 'Detalhe oficial da proposicao.',
            urlInteiroTeor:
              'https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=100',
            statusProposicao: {
              descricaoSituacao: 'Aguardando parecer',
              descricaoTramitacao: 'Aguardando designação de relator'
            }
          })
        },
        senadoClient: createEmptySenadoClient()
      }
    );

    expect(result).toMatchObject({
      status: 'fulfilled',
      data: {
        id: 'camara-proposicao-100',
        type: 'PL',
        number: '2',
        year: 2024,
        status: 'Aguardando parecer',
        currentStage: 'Aguardando designação de relator',
        officialSummary: 'Detalhe oficial da proposicao.',
        officialFullTextUrl:
          'https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=100',
        references: [
          {
            id: 'camara-proposicao-100-fonte-oficial',
            type: 'official',
            title: 'Página oficial da proposição',
            publisher: 'Câmara dos Deputados',
            url: 'https://www.camara.leg.br/propostas-legislativas/100'
          }
        ]
      },
      errors: []
    });
  });

  it('enriches a Camara proposition detail with official themes', async () => {
    let requestedDetailId: string | number | undefined;
    let requestedThemeId: string | number | undefined;
    const result = await getOfficialProposalDetail(
      {
        id: 'camara-proposicao-100',
        source: 'camara',
        sourceId: '100',
        title: 'PL 2/2024',
        type: 'PL',
        references: []
      },
      {
        camaraClient: {
          ...createEmptyCamaraClient(),
          getProposicaoById: async (id) => {
            requestedDetailId = id;
            return {
              id: 100,
              siglaTipo: 'PL',
              numero: 2,
              ano: 2024,
              ementa: 'Detalhe oficial da proposicao.',
              statusProposicao: {
                descricaoSituacao: 'Aguardando parecer'
              }
            };
          },
          getProposicaoTemasById: async (id) => {
            requestedThemeId = id;
            return [
              {
                codTema: 40,
                tema: 'Educacao'
              },
              {
                codTema: 60,
                tema: 'Saude'
              }
            ];
          }
        },
        senadoClient: createEmptySenadoClient()
      }
    );

    expect(requestedDetailId).toBe('100');
    expect(requestedThemeId).toBe('100');
    expect(result).toMatchObject({
      status: 'fulfilled',
      data: {
        id: 'camara-proposicao-100',
        subject: 'Educacao; Saude',
        status: 'Aguardando parecer',
        officialSummary: 'Detalhe oficial da proposicao.'
      },
      errors: []
    });
  });

  it('keeps Camara proposition detail available when official themes fail', async () => {
    const result = await getOfficialProposalDetail(
      {
        id: 'camara-proposicao-100',
        source: 'camara',
        sourceId: '100',
        title: 'PL 2/2024',
        type: 'PL',
        references: []
      },
      {
        camaraClient: {
          ...createEmptyCamaraClient(),
          getProposicaoById: async () => ({
            id: 100,
            siglaTipo: 'PL',
            numero: 2,
            ano: 2024,
            ementa: 'Detalhe oficial da proposicao.'
          }),
          getProposicaoTemasById: async () => {
            throw new CamaraApiClientError('A API da Camara retornou uma falha HTTP.', {
              kind: 'http',
              status: 503
            });
          }
        },
        senadoClient: createEmptySenadoClient()
      }
    );

    expect(result).toMatchObject({
      status: 'partial',
      data: {
        id: 'camara-proposicao-100',
        officialSummary: 'Detalhe oficial da proposicao.'
      },
      errors: [
        {
          source: 'camara',
          entity: 'proposal',
          kind: 'official-unavailable',
          status: 503
        }
      ]
    });
    expect(result.data?.subject).toBeUndefined();
  });

  it('applies catalog references when the official proposal id is cataloged', async () => {
    const result = await getOfficialProposalDetail(
      {
        id: 'bill-pl-220-2025',
        source: 'camara',
        sourceId: '220',
        title: 'PL 220/2025',
        type: 'PL',
        references: []
      },
      {
        camaraClient: {
          ...createEmptyCamaraClient(),
          getProposicaoById: async () => ({
            id: 220,
            siglaTipo: 'PL',
            numero: 220,
            ano: 2025
          })
        },
        senadoClient: createEmptySenadoClient()
      }
    );

    expect(result.data?.references).toEqual([
      expect.objectContaining({
        id: 'bill-pl-220-2025-official-camara',
        type: 'official',
        checkedAt: '2026-06-29'
      })
    ]);
  });

  it('applies reviewed factual summary when the selected proposal id is cataloged', async () => {
    const result = await getOfficialProposalDetail(
      {
        id: 'bill-pl-1234-2024',
        source: 'camara',
        sourceId: '1234',
        title: 'PL 1234/2024',
        type: 'PL',
        references: []
      },
      {
        camaraClient: {
          ...createEmptyCamaraClient(),
          getProposicaoById: async () => ({
            id: 1234,
            siglaTipo: 'PL',
            numero: 1234,
            ano: 2024,
            ementa: 'Ementa oficial retornada pela Camara.'
          })
        },
        senadoClient: createEmptySenadoClient()
      }
    );

    expect(result.data).toMatchObject({
      id: 'camara-proposicao-1234',
      officialSummary: 'Ementa oficial retornada pela Camara.',
      simplifiedSummary:
        'A proposição trata da publicação de informações educacionais por instituições públicas de ensino.'
    });
  });

  it('loads a Senado matter detail by official source id', async () => {
    const result = await getOfficialProposalDetail(
      {
        id: 'senado-materia-300',
        source: 'senado',
        sourceId: '300',
        title: 'PLS 3/2024',
        type: 'PLS',
        references: []
      },
      {
        camaraClient: createEmptyCamaraClient(),
        senadoClient: {
          ...createEmptySenadoClient(),
          getMateriaById: async () => ({
            IdentificacaoMateria: {
              CodigoMateria: '300',
              SiglaSubtipoMateria: 'PLS',
              NumeroMateria: '00003',
              AnoMateria: '2024'
            },
            DadosBasicosMateria: {
              EmentaMateria: 'Detalhe oficial da materia.'
            }
          })
        }
      }
    );

    expect(result).toMatchObject({
      status: 'fulfilled',
      data: {
        id: 'senado-materia-300',
        title: 'PLS 3/2024',
        officialSummary: 'Detalhe oficial da materia.',
        references: [
          {
            id: 'senado-materia-300-fonte-oficial',
            type: 'official',
            title: 'Página oficial da matéria',
            publisher: 'Senado Federal',
            url: 'https://www25.senado.leg.br/web/atividade/materias/-/materia/300'
          }
        ]
      },
      errors: []
    });
  });

  it('loads a modern Senado process detail by official process source id', async () => {
    const result = await getOfficialProposalDetail(
      {
        id: 'senado-processo-9046221',
        source: 'senado',
        sourceId: '9046221',
        title: 'RQS 368/2026',
        type: 'RQS',
        references: []
      },
      {
        camaraClient: createEmptyCamaraClient(),
        senadoClient: {
          ...createEmptySenadoClient(),
          getProcessoById: async () => ({
            id: 9046221,
            codigoMateria: 174108,
            identificacao: 'RQS 368/2026',
            sigla: 'RQS',
            numero: '368',
            ano: 2026,
            conteudo: {
              tipo: 'Urgencia para materia',
              ementa: 'Detalhe moderno oficial da materia.'
            },
            documento: {
              dataApresentacao: '2026-05-12',
              url: 'https://legis.senado.gov.br/sdleg-getter/documento?dm=10220595'
            },
            situacaoAtual: 'PRONTO PARA DELIBERACAO DO PLENARIO'
          })
        }
      }
    );

    expect(result).toMatchObject({
      status: 'fulfilled',
      data: {
        id: 'senado-processo-9046221',
        title: 'RQS 368/2026',
        type: 'RQS',
        number: '368',
        year: 2026,
        subject: 'Urgencia para materia',
        status: 'PRONTO PARA DELIBERACAO DO PLENARIO',
        officialSummary: 'Detalhe moderno oficial da materia.',
        officialFullTextUrl: 'https://legis.senado.gov.br/sdleg-getter/documento?dm=10220595',
        references: [
          {
            id: 'senado-processo-9046221-fonte-oficial',
            type: 'official',
            title: 'Fonte oficial do processo legislativo',
            publisher: 'Senado Federal',
            url: 'https://www25.senado.leg.br/web/atividade/materias/-/materia/174108'
          }
        ]
      },
      errors: []
    });
  });

  it('represents proposal detail timeouts as recoverable failures', async () => {
    const result = await getOfficialProposalDetail(
      {
        id: 'senado-materia-300',
        source: 'senado',
        sourceId: '300',
        title: 'PLS 3/2024',
        type: 'PLS',
        references: []
      },
      {
        camaraClient: createEmptyCamaraClient(),
        senadoClient: {
          ...createEmptySenadoClient(),
          getMateriaById: async () => {
            throw new SenadoApiClientError('timeout', {
              kind: 'timeout'
            });
          }
        }
      }
    );

    expect(result).toEqual({
      status: 'failed',
      data: null,
      errors: [
        {
          source: 'senado',
          entity: 'proposal',
          kind: 'timeout',
          message:
            'A consulta oficial de proposição ou matéria do Senado Federal excedeu o tempo limite.'
        }
      ]
    });
  });
});
