import { describe, expect, it } from 'vitest';
import { getParliamentarianById } from './parliamentarianService';

describe('getParliamentarianById', () => {
  it('returns a complete parliamentarian as a domain contract', () => {
    const parliamentarian = getParliamentarianById('parliamentarian-ana-costa');

    expect(parliamentarian).toMatchObject({
      id: 'parliamentarian-ana-costa',
      source: 'camara',
      name: 'Ana Costa',
      fullName: 'Ana Maria Costa',
      office: 'Deputada federal',
      party: 'Partido A',
      state: 'MG',
      photoUrl: '/parliamentarians/ana-costa.svg'
    });
  });

  it('keeps partial parliamentarian data explicit', () => {
    const parliamentarian = getParliamentarianById('parliamentarian-bruno-ribeiro');

    expect(parliamentarian).toMatchObject({
      id: 'parliamentarian-bruno-ribeiro',
      source: 'senado',
      name: 'Bruno Ribeiro',
      office: 'Senador'
    });
    expect(parliamentarian?.photoUrl).toBeUndefined();
    expect(parliamentarian?.email).toBeUndefined();
    expect(parliamentarian?.fullName).toBeUndefined();
  });

  it('returns null for an unknown parliamentarian id', () => {
    expect(getParliamentarianById('parliamentarian-nao-existente')).toBeNull();
  });
});
