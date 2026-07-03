import { unavailableOfficialFieldLabel } from './officialMessages';

function formatIsoDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

export function formatPresentedAt(value?: string) {
  return formatIsoDate(value) ?? unavailableOfficialFieldLabel;
}

export function formatVotedAt(value?: string) {
  return formatIsoDate(value) ?? unavailableOfficialFieldLabel;
}

export function formatCheckedAt(value?: string) {
  return formatIsoDate(value);
}
