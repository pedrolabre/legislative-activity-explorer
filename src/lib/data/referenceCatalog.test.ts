import { describe, expect, it } from 'vitest';
import { EXTERNAL_REFERENCE_TYPES } from '$lib/domain';
import {
  findReferenceCatalogEntries,
  findReferencesForProposal,
  getReferenceCatalogEntriesByType,
  getReferencesByProposalId,
  referenceCatalog
} from './referenceCatalog';

const acceptedReferenceTypes = new Set(EXTERNAL_REFERENCE_TYPES);
const checkedAtPattern = /^\d{4}-\d{2}-\d{2}$/;

function isExternalHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      Boolean(url.hostname) &&
      url.hostname !== 'localhost' &&
      url.hostname !== '127.0.0.1'
    );
  } catch {
    return false;
  }
}

describe('referenceCatalog', () => {
  it('keeps reviewed references associated with proposals', () => {
    expect(referenceCatalog.length).toBeGreaterThan(0);

    for (const entry of referenceCatalog) {
      expect(entry.proposalId.trim()).toBe(entry.proposalId);
      expect(entry.proposalId).not.toBe('');
      expect(entry.reference.id.trim()).toBe(entry.reference.id);
      expect(entry.reference.id).not.toBe('');
      expect(acceptedReferenceTypes.has(entry.reference.type)).toBe(true);
      expect(entry.reference.title.trim()).toBe(entry.reference.title);
      expect(entry.reference.title).not.toBe('');
      expect(entry.reference.publisher.trim()).toBe(entry.reference.publisher);
      expect(entry.reference.publisher).not.toBe('');
      expect(isExternalHttpUrl(entry.reference.url)).toBe(true);
    }
  });

  it('keeps canonical IDs and aliases populated for all reference entries', () => {
    for (const entry of referenceCatalog) {
      expect(entry.canonicalId).toBeDefined();
      expect(entry.canonicalId?.trim()).toBe(entry.canonicalId);
      expect(entry.aliases).toBeDefined();
      expect(entry.aliases?.length).toBeGreaterThan(0);
      for (const alias of entry.aliases ?? []) {
        expect(alias.trim()).toBe(alias);
        expect(alias).not.toBe('');
      }
    }
  });

  it('covers the required editorial catalog reference types', () => {
    const catalogTypes = new Set(referenceCatalog.map((entry) => entry.reference.type));

    expect(catalogTypes).toEqual(new Set(['official', 'press', 'technical']));
  });

  it('keeps reference ids unique', () => {
    const referenceIds = referenceCatalog.map((entry) => entry.reference.id);

    expect(new Set(referenceIds).size).toBe(referenceIds.length);
  });

  it('uses an ISO date for checked references', () => {
    for (const entry of referenceCatalog) {
      if (!entry.reference.checkedAt) {
        continue;
      }

      expect(entry.reference.checkedAt).toMatch(checkedAtPattern);
      expect(Number.isNaN(Date.parse(entry.reference.checkedAt))).toBe(false);
    }
  });

  it('returns references by legacy proposal id without touching other proposals', () => {
    const references = getReferencesByProposalId('bill-pl-1234-2024');

    expect(references.map((reference) => reference.type)).toEqual([
      'official',
      'press',
      'technical'
    ]);
    expect(getReferencesByProposalId('proposal-sem-referencia')).toEqual([]);
  });

  it('resolves references by canonical slug and standard notation', () => {
    const plCanonicalRefs = getReferencesByProposalId('pl-1234-2024');
    expect(plCanonicalRefs.map((ref) => ref.type)).toEqual(['official', 'press', 'technical']);

    const plFormattedRefs = getReferencesByProposalId('PL 1234/2024');
    expect(plFormattedRefs.map((ref) => ref.type)).toEqual(['official', 'press', 'technical']);

    const pecCanonicalRefs = getReferencesByProposalId('pec-45-2023');
    expect(pecCanonicalRefs.map((ref) => ref.type)).toEqual(['official', 'press', 'technical']);

    const pecFormattedRefs = getReferencesByProposalId('PEC 45/2023');
    expect(pecFormattedRefs.map((ref) => ref.type)).toEqual(['official', 'press', 'technical']);
  });

  it('resolves references by official house aliases', () => {
    const camaraRefs = getReferencesByProposalId('camara-proposicao-1234');
    expect(camaraRefs.map((ref) => ref.type)).toEqual(['official', 'press', 'technical']);

    const camaraPartialRefs = getReferencesByProposalId('camara-proposicao-220');
    expect(camaraPartialRefs.map((ref) => ref.type)).toEqual(['official']);

    const senadoRefs = getReferencesByProposalId('senado-materia-45');
    expect(senadoRefs.map((ref) => ref.type)).toEqual(['official', 'press', 'technical']);

    const senadoProcessoRefs = getReferencesByProposalId('senado-processo-45');
    expect(senadoProcessoRefs.map((ref) => ref.type)).toEqual(['official', 'press', 'technical']);
  });

  it('resolves references for structured proposal objects', () => {
    const structuredCamara = findReferencesForProposal({
      id: 'camara-proposicao-1234',
      type: 'PL',
      number: '1234',
      year: 2024
    });
    expect(structuredCamara.map((ref) => ref.type)).toEqual(['official', 'press', 'technical']);

    const structuredSenado = findReferencesForProposal({
      id: 'senado-materia-45',
      type: 'PEC',
      number: '45',
      year: 2023
    });
    expect(structuredSenado.map((ref) => ref.type)).toEqual(['official', 'press', 'technical']);

    const structuredUncataloged = findReferencesForProposal({
      id: 'camara-proposicao-9999',
      type: 'PL',
      number: '9999',
      year: 2099
    });
    expect(structuredUncataloged).toEqual([]);
  });

  it('returns catalog entries by reference type', () => {
    const technicalEntries = getReferenceCatalogEntriesByType('technical');

    expect(technicalEntries.length).toBeGreaterThan(0);
    expect(technicalEntries.every((entry) => entry.reference.type === 'technical')).toBe(true);
  });

  it('finds catalog entries by structured lookup matching metadata', () => {
    const entries = findReferenceCatalogEntries({
      type: 'PL',
      number: '220',
      year: 2025
    });

    expect(entries.length).toBe(1);
    expect(entries[0].reference.id).toBe('bill-pl-220-2025-official-camara');
  });
});
