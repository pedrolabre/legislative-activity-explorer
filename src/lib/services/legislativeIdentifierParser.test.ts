import { describe, expect, it } from 'vitest';
import {
  parseDirectProposalQuery,
  parseLegislativeIdentifier
} from './legislativeIdentifierParser';

describe('parseLegislativeIdentifier', () => {
  it('extracts type, number and year from national legislative identifiers', () => {
    expect(parseDirectProposalQuery('PL2630')).toEqual({
      type: 'PL',
      number: '2630',
      year: undefined,
      label: 'PL 2630'
    });
    expect(parseDirectProposalQuery('PL 2630')).toEqual({
      type: 'PL',
      number: '2630',
      year: undefined,
      label: 'PL 2630'
    });
    expect(parseDirectProposalQuery('PL-2630')).toEqual({
      type: 'PL',
      number: '2630',
      year: undefined,
      label: 'PL 2630'
    });
    expect(parseDirectProposalQuery('PL 2630/2020')).toEqual({
      type: 'PL',
      number: '2630',
      year: 2020,
      label: 'PL 2630/2020'
    });
    expect(parseDirectProposalQuery('PLP 19/2023')).toEqual({
      type: 'PLP',
      number: '19',
      year: 2023,
      label: 'PLP 19/2023'
    });
    expect(parseDirectProposalQuery('PEC 45')).toEqual({
      type: 'PEC',
      number: '45',
      year: undefined,
      label: 'PEC 45'
    });
  });

  it('recognizes scoped official national proposal types explicitly', () => {
    expect(parseDirectProposalQuery('PDC 100/2019')?.type).toBe('PDC');
    expect(parseDirectProposalQuery('PDL 508/2021')?.type).toBe('PDL');
    expect(parseDirectProposalQuery('MPV 1300/2025')?.type).toBe('MPV');
    expect(parseDirectProposalQuery('REQ 10/2024')?.type).toBe('REQ');
    expect(parseDirectProposalQuery('RQS 368/2026')?.type).toBe('RQS');
    expect(parseDirectProposalQuery('RQN 1/2024')?.type).toBe('RQN');
    expect(parseDirectProposalQuery('MSC 123/2023')?.type).toBe('MSC');
    expect(parseDirectProposalQuery('PLS 258/2016')?.type).toBe('PLS');
    expect(parseDirectProposalQuery('PLC 79/2016')?.type).toBe('PLC');
    expect(parseDirectProposalQuery('PLV 15/2024')?.type).toBe('PLV');
    expect(parseDirectProposalQuery('PRS 12/2024')?.type).toBe('PRS');
    expect(parseDirectProposalQuery('PDS 10/2015')?.type).toBe('PDS');
    expect(parseDirectProposalQuery('PRC 20/2024')?.type).toBe('PRC');
  });

  it('does not confuse parliamentarian names with legislative identifiers', () => {
    expect(parseLegislativeIdentifier('Plinio Valerio')).toMatchObject({
      ok: false,
      attempted: false,
      reason: 'not-an-identifier'
    });
    expect(parseLegislativeIdentifier('Marina Silva')).toMatchObject({
      ok: false,
      attempted: false,
      reason: 'not-an-identifier'
    });
    expect(parseLegislativeIdentifier('Ana PL 2630')).toMatchObject({
      ok: false,
      attempted: false,
      reason: 'not-an-identifier'
    });
  });

  it('returns explainable failures for malformed direct identifier attempts', () => {
    expect(parseLegislativeIdentifier('PL 2630/20')).toMatchObject({
      ok: false,
      attempted: true,
      reason: 'malformed-identifier',
      message:
        'Identificador legislativo incompleto. Use formatos como PL 2630/2020, PL-2630 ou PEC 45.'
    });
    expect(parseLegislativeIdentifier('PL 0/2020')).toMatchObject({
      ok: false,
      attempted: true,
      reason: 'malformed-identifier'
    });
    expect(parseLegislativeIdentifier('XYZ 10/2024')).toMatchObject({
      ok: false,
      attempted: true,
      reason: 'unsupported-type',
      message: 'Tipo legislativo XYZ não está no parser nacional desta versão.'
    });
  });
});
