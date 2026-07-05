import { describe, expect, it } from 'vitest';
import { SenadoMapperError } from './senadoMapper';
import {
  mapSenadoMateriaToLegislativeProposal,
  mapSenadoMateriasToLegislativeProposals,
  mapSenadoProcessoToLegislativeProposal,
  mapSenadoProcessosToLegislativeProposals,
  mapSenadoSenadorToParliamentarian
} from './senadoMapper';

describe('mapSenadoSenadorToParliamentarian', () => {
  it('normalizes a current Senado senator payload to the domain contract', () => {
    const parliamentarian = mapSenadoSenadorToParliamentarian({
      IdentificacaoParlamentar: {
        CodigoParlamentar: '5672',
        CodigoPublicoNaLegAtual: '800',
        NomeParlamentar: 'Alan Rick',
        NomeCompletoParlamentar: 'Alan Rick Miranda',
        SiglaPartidoParlamentar: 'REPUBLICANOS',
        UfParlamentar: 'AC',
        UrlFotoParlamentar: 'http://www.senado.leg.br/senadores/img/fotos-oficiais/senador5672.jpg',
        UrlPaginaParlamentar: 'http://www25.senado.leg.br/web/senadores/senador/-/perfil/5672',
        EmailParlamentar: 'sen.alanrick@senado.leg.br'
      },
      Mandato: {
        UfParlamentar: 'AC',
        DescricaoParticipacao: 'Titular',
        PrimeiraLegislaturaDoMandato: {
          DataInicio: '2023-02-01',
          DataFim: '2027-01-31'
        },
        SegundaLegislaturaDoMandato: {
          DataInicio: '2027-02-01',
          DataFim: '2031-01-31'
        },
        Exercicios: {
          Exercicio: {
            DataInicio: '2023-02-01'
          }
        }
      }
    });

    expect(parliamentarian).toEqual({
      id: 'senado-5672',
      source: 'senado',
      sourceId: '5672',
      name: 'Alan Rick',
      fullName: 'Alan Rick Miranda',
      office: 'Senador',
      party: 'REPUBLICANOS',
      state: 'AC',
      status: undefined,
      term: '2023-02-01 a 2031-01-31',
      termLabel: 'Mandato',
      photoUrl: 'http://www.senado.leg.br/senadores/img/fotos-oficiais/senador5672.jpg',
      email: 'sen.alanrick@senado.leg.br',
      officialUrl: 'http://www25.senado.leg.br/web/senadores/senador/-/perfil/5672'
    });
  });

  it('keeps missing optional senator fields undefined and maps the legacy current flag', () => {
    const parliamentarian = mapSenadoSenadorToParliamentarian({
      IdentificacaoParlamentar: {
        CodigoParlamentar: '5987',
        NomeParlamentar: null,
        NomeCompletoParlamentar: '',
        SiglaPartidoParlamentar: null,
        UfParlamentar: undefined,
        UrlFotoParlamentar: null,
        EmailParlamentar: '',
        MembroAtual: 'Não'
      }
    });

    expect(parliamentarian).toMatchObject({
      id: 'senado-5987',
      sourceId: '5987',
      name: 'Senador 5987',
      office: 'Senador',
      status: 'Fim de Mandato',
      officialUrl: 'https://www25.senado.leg.br/web/senadores/senador/-/perfil/5987'
    });
    expect(parliamentarian.fullName).toBeUndefined();
    expect(parliamentarian.party).toBeUndefined();
    expect(parliamentarian.state).toBeUndefined();
    expect(parliamentarian.term).toBeUndefined();
    expect(parliamentarian.termLabel).toBeUndefined();
    expect(parliamentarian.photoUrl).toBeUndefined();
    expect(parliamentarian.email).toBeUndefined();
  });

  it('uses official mandate records supplied by the senator detail service', () => {
    const parliamentarian = mapSenadoSenadorToParliamentarian(
      {
        IdentificacaoParlamentar: {
          CodigoParlamentar: '6000',
          NomeParlamentar: 'Joana Lima',
          SiglaPartidoParlamentar: 'XYZ'
        }
      },
      {
        mandates: [
          {
            DescricaoParticipacao: 'Titular',
            PrimeiraLegislaturaDoMandato: {
              DataInicio: '2015-02-01'
            },
            SegundaLegislaturaDoMandato: {
              DataFim: '2023-01-31'
            },
            Exercicios: {
              Exercicio: {
                DataInicio: '2015-02-01',
                DataFim: '2023-01-31'
              }
            }
          },
          {
            UfParlamentar: 'RJ',
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
    );

    expect(parliamentarian).toMatchObject({
      id: 'senado-6000',
      state: 'RJ',
      status: undefined,
      term: '2023-02-01 a 2031-01-31',
      termLabel: 'Mandato'
    });
  });

  it('does not invent a mandate when official dates are incomplete', () => {
    const parliamentarian = mapSenadoSenadorToParliamentarian(
      {
        IdentificacaoParlamentar: {
          CodigoParlamentar: '6001',
          NomeParlamentar: 'Paulo Nunes'
        }
      },
      {
        mandates: [
          {
            CodigoMandato: '1000',
            PrimeiraLegislaturaDoMandato: {
              NumeroLegislatura: '57'
            }
          }
        ]
      }
    );

    expect(parliamentarian.term).toBeUndefined();
    expect(parliamentarian.termLabel).toBeUndefined();
    expect(parliamentarian.status).toBeUndefined();
  });

  it('represents a missing senator id as a mapper error', () => {
    expect(() =>
      mapSenadoSenadorToParliamentarian({
        IdentificacaoParlamentar: {
          NomeParlamentar: 'Sem id'
        }
      })
    ).toThrow(SenadoMapperError);
  });
});

describe('mapSenadoMateriaToLegislativeProposal', () => {
  it('normalizes a complete Senado matter payload to the domain contract', () => {
    const proposal = mapSenadoMateriaToLegislativeProposal({
      IdentificacaoMateria: {
        CodigoMateria: '45',
        SiglaSubtipoMateria: 'DIV',
        DescricaoSubtipoMateria: 'Diversos',
        NumeroMateria: '00007',
        AnoMateria: '1999',
        DescricaoIdentificacaoMateria: 'DIV 7/1999',
        IndicadorTramitando: 'Não',
        IdentificacaoProcesso: '3166283'
      },
      DadosBasicosMateria: {
        EmentaMateria: 'Encaminha ao Senado Federal cópia de decisão do Tribunal de Contas da União.',
        DataApresentacao: '1999-02-11',
        NaturezaMateria: {
          DescricaoNatureza: 'Comunicação'
        }
      },
      DecisaoEDestino: {
        Decisao: {
          Descricao: 'Conhecida'
        }
      }
    });

    expect(proposal).toEqual({
      id: 'senado-materia-45',
      source: 'senado',
      sourceId: '45',
      title: 'DIV 7/1999',
      type: 'DIV',
      number: '7',
      year: 1999,
      status: 'Conhecida',
      subject: 'Comunicação',
      presentedAt: '1999-02-11',
      officialSummary: 'Encaminha ao Senado Federal cópia de decisão do Tribunal de Contas da União.',
      officialUrl: 'https://www25.senado.leg.br/web/atividade/materias/-/materia/45',
      references: [
        {
          id: 'senado-materia-45-fonte-oficial',
          type: 'official',
          title: 'Página oficial da matéria',
          publisher: 'Senado Federal',
          url: 'https://www25.senado.leg.br/web/atividade/materias/-/materia/45'
        }
      ]
    });
  });

  it('keeps missing optional matter fields undefined and preserves references', () => {
    const proposal = mapSenadoMateriaToLegislativeProposal({
      IdentificacaoMateria: {
        CodigoMateria: '300',
        SiglaSubtipoMateria: null,
        NumeroMateria: null,
        AnoMateria: null,
        IndicadorTramitando: null
      },
      DadosBasicosMateria: {
        EmentaMateria: '',
        DataApresentacao: null
      }
    });

    expect(proposal).toMatchObject({
      id: 'senado-materia-300',
      sourceId: '300',
      title: 'Matéria 300',
      type: 'Matéria',
      officialUrl: 'https://www25.senado.leg.br/web/atividade/materias/-/materia/300'
    });
    expect(proposal.number).toBeUndefined();
    expect(proposal.year).toBeUndefined();
    expect(proposal.status).toBeUndefined();
    expect(proposal.subject).toBeUndefined();
    expect(proposal.presentedAt).toBeUndefined();
    expect(proposal.officialSummary).toBeUndefined();
    expect(proposal.references).toEqual([
      {
        id: 'senado-materia-300-fonte-oficial',
        type: 'official',
        title: 'Página oficial da matéria',
        publisher: 'Senado Federal',
        url: 'https://www25.senado.leg.br/web/atividade/materias/-/materia/300'
      }
    ]);
  });

  it('normalizes a list of Senado matter payloads', () => {
    expect(
      mapSenadoMateriasToLegislativeProposals([
        {
          IdentificacaoMateria: {
            CodigoMateria: 1,
            SiglaSubtipoMateria: 'PL',
            NumeroMateria: '00010',
            AnoMateria: '2024'
          }
        },
        {
          IdentificacaoMateria: {
            CodigoMateria: 2,
            SiglaSubtipoMateria: 'PEC',
            NumeroMateria: '00045',
            AnoMateria: '2023'
          }
        }
      ]).map((proposal) => proposal.title)
    ).toEqual(['PL 10/2024', 'PEC 45/2023']);
  });

  it('represents a missing matter id as a mapper error', () => {
    expect(() =>
      mapSenadoMateriaToLegislativeProposal({
        IdentificacaoMateria: {
          SiglaSubtipoMateria: 'PL'
        }
      })
    ).toThrow(SenadoMapperError);
  });
});

describe('mapSenadoProcessoToLegislativeProposal', () => {
  it('normalizes a modern Senado process list payload to the domain contract', () => {
    const proposal = mapSenadoProcessoToLegislativeProposal({
      id: 9046221,
      codigoMateria: 174108,
      identificacao: 'RQS 368/2026',
      casaIdentificadora: 'SF',
      tipoConteudo: 'Urgencia para materia',
      tipoDocumento: 'Requerimento',
      ementa: 'Requer urgencia para materia.',
      dataApresentacao: '2026-05-12',
      situacaoAtual: 'PRONTO PARA DELIBERACAO DO PLENARIO',
      tramitando: 'Sim',
      urlDocumento: 'https://legis.senado.gov.br/sdleg-getter/documento?dm=10220595'
    });

    expect(proposal).toEqual({
      id: 'senado-processo-9046221',
      source: 'senado',
      sourceId: '9046221',
      title: 'RQS 368/2026',
      type: 'RQS',
      number: '368',
      year: 2026,
      status: 'PRONTO PARA DELIBERACAO DO PLENARIO',
      subject: 'Urgencia para materia',
      presentedAt: '2026-05-12',
      officialSummary: 'Requer urgencia para materia.',
      officialUrl: 'https://www25.senado.leg.br/web/atividade/materias/-/materia/174108',
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
    });
  });

  it('normalizes a modern Senado process detail payload with nested content', () => {
    const proposal = mapSenadoProcessoToLegislativeProposal({
      id: '9046221',
      codigoMateria: '174108',
      identificacao: 'RQS 368/2026',
      sigla: 'RQS',
      numero: '368',
      ano: '2026',
      conteudo: {
        tipo: 'Urgencia para materia',
        ementa: 'Ementa retornada no detalhe moderno.'
      },
      documento: {
        dataApresentacao: '2026-05-12',
        url: 'https://legis.senado.gov.br/sdleg-getter/documento?dm=10220595'
      },
      tramitando: 'Sim'
    });

    expect(proposal).toMatchObject({
      id: 'senado-processo-9046221',
      title: 'RQS 368/2026',
      type: 'RQS',
      number: '368',
      year: 2026,
      status: 'Em tramitação',
      subject: 'Urgencia para materia',
      presentedAt: '2026-05-12',
      officialSummary: 'Ementa retornada no detalhe moderno.',
      officialFullTextUrl: 'https://legis.senado.gov.br/sdleg-getter/documento?dm=10220595'
    });
  });

  it('keeps missing optional process fields undefined without using legacy matter ids', () => {
    const proposal = mapSenadoProcessoToLegislativeProposal({
      id: 9046221
    });

    expect(proposal).toMatchObject({
      id: 'senado-processo-9046221',
      sourceId: '9046221',
      title: 'Processo 9046221',
      type: 'Processo',
      officialUrl: 'https://legis.senado.leg.br/dadosabertos/processo/9046221'
    });
    expect(proposal.number).toBeUndefined();
    expect(proposal.year).toBeUndefined();
    expect(proposal.status).toBeUndefined();
    expect(proposal.subject).toBeUndefined();
    expect(proposal.presentedAt).toBeUndefined();
    expect(proposal.officialSummary).toBeUndefined();
  });

  it('normalizes a list of modern Senado process payloads', () => {
    expect(
      mapSenadoProcessosToLegislativeProposals([
        {
          id: 1,
          identificacao: 'RQS 368/2026'
        },
        {
          id: 2,
          identificacao: 'PL 1102/2026'
        }
      ]).map((proposal) => proposal.title)
    ).toEqual(['RQS 368/2026', 'PL 1102/2026']);
  });

  it('represents a missing process id as a mapper error', () => {
    expect(() =>
      mapSenadoProcessoToLegislativeProposal({
        identificacao: 'RQS 368/2026'
      })
    ).toThrow(SenadoMapperError);
  });
});
