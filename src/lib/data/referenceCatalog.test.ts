import { describe, expect, it } from 'vitest';
import { EXTERNAL_REFERENCE_TYPES } from '$lib/domain';
import {
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

  it('covers the accepted catalog reference types', () => {
    const catalogTypes = new Set(referenceCatalog.map((entry) => entry.reference.type));

    expect(catalogTypes).toEqual(new Set(EXTERNAL_REFERENCE_TYPES));
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

  it('returns references by proposal id without touching other proposals', () => {
    const references = getReferencesByProposalId('bill-pl-1234-2024');

    expect(references.map((reference) => reference.type)).toEqual([
      'official',
      'press',
      'technical'
    ]);
    expect(getReferencesByProposalId('proposal-sem-referencia')).toEqual([]);
  });

  it('returns catalog entries by reference type', () => {
    const technicalEntries = getReferenceCatalogEntriesByType('technical');

    expect(technicalEntries.length).toBeGreaterThan(0);
    expect(technicalEntries.every((entry) => entry.reference.type === 'technical')).toBe(true);
  });
});
