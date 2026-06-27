import { describe, expect, it } from 'vitest';
import { getParliamentarianDetailById } from './parliamentarianDetailFixtures';

describe('getParliamentarianDetailById', () => {
  it('returns a complete parliamentarian profile when available', () => {
    const parliamentarian = getParliamentarianDetailById('parliamentarian-ana-costa');

    expect(parliamentarian).toMatchObject({
      name: 'Ana Costa',
      party: 'Partido A',
      state: 'MG',
      status: 'Em exercício',
      photoUrl: '/parliamentarians/ana-costa.svg'
    });
  });

  it('keeps partial parliamentarian data explicit', () => {
    const parliamentarian = getParliamentarianDetailById('parliamentarian-bruno-ribeiro');

    expect(parliamentarian).toMatchObject({
      name: 'Bruno Ribeiro',
      party: 'Partido B',
      state: 'RS',
      status: 'Em exercício'
    });
    expect(parliamentarian?.photoUrl).toBeUndefined();
    expect(parliamentarian?.email).toBeUndefined();
    expect(parliamentarian?.fullName).toBeUndefined();
  });

  it('returns undefined for an unknown parliamentarian id', () => {
    expect(getParliamentarianDetailById('parliamentarian-nao-existente')).toBeUndefined();
  });
});
