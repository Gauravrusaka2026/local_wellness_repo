const combiningMarks = /[\u0300-\u036f]/gu;
const punctuation = /[^a-z0-9]+/gu;

export const normalizeGovernanceText = (value: string): string =>
  value.normalize('NFC').trim().replace(/\s+/gu, ' ');

export const normalizeGovernanceKey = (value: string): string =>
  normalizeGovernanceText(value).toLocaleLowerCase('en-US');

export const governanceSlug = (value: string): string =>
  normalizeGovernanceText(value)
    .normalize('NFKD')
    .replace(combiningMarks, '')
    .toLocaleLowerCase('en-US')
    .replace(punctuation, '-')
    .replace(/^-|-$/gu, '');

export const normalizeOptionalGovernanceText = (
  value: string,
  isPlaceholder: (candidate: string) => boolean,
): string | null => {
  const normalized = normalizeGovernanceText(value);
  return normalized.length === 0 || isPlaceholder(normalized) ? null : normalized;
};

export const isVerifiedGovernanceStatus = (value: string): boolean => {
  const normalized = normalizeGovernanceKey(value);
  return normalized === 'verified' || normalized === 'official';
};
