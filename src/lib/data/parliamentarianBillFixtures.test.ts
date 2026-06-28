import { describe, expect, it } from 'vitest';
import { getBillById, getBillsByParliamentarianId } from './parliamentarianBillFixtures';

describe('getBillsByParliamentarianId', () => {
  it('returns controlled bills associated with a parliamentarian', () => {
    const bills = getBillsByParliamentarianId('parliamentarian-ana-costa');

    expect(bills.map((bill) => bill.identification)).toEqual(['PL 220/2025', 'PL 1234/2024']);
  });

  it('returns an empty list for a parliamentarian without controlled bills', () => {
    expect(getBillsByParliamentarianId('parliamentarian-sem-proposicoes')).toEqual([]);
  });
});

describe('getBillById', () => {
  it('returns a complete bill detail when available', () => {
    const bill = getBillById('bill-pl-1234-2024');

    expect(bill).toMatchObject({
      identification: 'PL 1234/2024',
      chamber: 'Câmara dos Deputados',
      subject: 'Educação',
      presentedAt: '2024-03-15',
      factualSummary:
        'A proposição trata da publicação de informações educacionais por instituições públicas de ensino.'
    });
    expect(bill?.sources).toHaveLength(2);
  });

  it('keeps partial bill data explicit', () => {
    const bill = getBillById('bill-pl-220-2025');

    expect(bill).toMatchObject({
      identification: 'PL 220/2025',
      chamber: 'Câmara dos Deputados',
      subject: 'Direitos do consumidor'
    });
    expect(bill?.presentedAt).toBeUndefined();
    expect(bill?.factualSummary).toBeUndefined();
    expect(bill?.sources).toEqual([]);
  });

  it('returns undefined for an unknown bill id', () => {
    expect(getBillById('bill-nao-existente')).toBeUndefined();
  });
});
