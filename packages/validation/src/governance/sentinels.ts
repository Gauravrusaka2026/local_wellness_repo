import { normalizeGovernanceKey } from './normalize.js';

const exactPlaceholderValues = new Set([
  'current name from district portal',
  'current name from zp/district portal',
  'district portal',
  'district-specific',
  'extraction required',
  'gis polygon pending',
  'lgd code pending',
  'mumbai / official address to verify',
  'municipal source required',
  'needs contact extraction',
  'needs official lgd code',
  'official address to verify',
  'official district portal',
  'official portal',
  'parent gp pending',
  'role record; current incumbent to verify',
  'role verified; name pending',
  'seed placeholder for phase 2',
  'template seed',
  'to be extracted',
  'to be populated from lgd',
  'to be populated from lgd/egramswaraj',
  'to be verified',
  'village lgd code pending',
  'ward directory required',
  'zone pending',
]);

const placeholderPrefixes = [
  'baseline list; verify ',
  'official list; contacts pending',
  'official address to verify',
];

export const isGovernancePlaceholder = (value: string): boolean => {
  const normalized = normalizeGovernanceKey(value);
  if (normalized.length === 0) {
    return false;
  }

  return (
    exactPlaceholderValues.has(normalized) ||
    placeholderPrefixes.some((prefix) => normalized.startsWith(prefix))
  );
};

export const isGovernancePlaceholderContact = (value: string): boolean => {
  const normalized = normalizeGovernanceKey(value);
  return (
    isGovernancePlaceholder(value) ||
    normalized.includes('district-specific') ||
    normalized === 'official portal / grievance app / helpline'
  );
};

export const isGovernancePlaceholderCode = (value: string): boolean => {
  const normalized = normalizeGovernanceKey(value);
  return normalized.includes('code pending') || normalized.startsWith('needs official ');
};
