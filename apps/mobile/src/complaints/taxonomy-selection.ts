import type {
  ComplaintCustomAttributes,
  ComplaintDraft,
  ComplaintTaxonomyCatalogItem,
} from '@local-wellness/types';

export const complaintTaxonomyAttributeKeys = [
  'taxonomy_primary_code',
  'taxonomy_subcategory_code',
  'taxonomy_workflow_type',
] as const;

export type ComplaintTaxonomyPrimaryOption = Readonly<{
  id: string;
  code: string;
  name: string;
}>;

export const buildComplaintTaxonomyAttributes = (
  item: ComplaintTaxonomyCatalogItem,
): ComplaintCustomAttributes => ({
  taxonomy_primary_code: item.primaryCode,
  taxonomy_subcategory_code: item.subcategoryCode,
  taxonomy_workflow_type: item.workflowType,
});

export const listComplaintTaxonomyPrimaryOptions = (
  items: readonly ComplaintTaxonomyCatalogItem[],
): ComplaintTaxonomyPrimaryOption[] => {
  const options = new Map<string, ComplaintTaxonomyPrimaryOption>();

  for (const item of items) {
    const existing = options.get(item.primaryCode);
    if (
      existing &&
      (existing.id !== item.primaryCategoryId || existing.name !== item.primaryName)
    ) {
      return [];
    }
    options.set(item.primaryCode, {
      id: item.primaryCategoryId,
      code: item.primaryCode,
      name: item.primaryName,
    });
  }

  return [...options.values()].sort((left, right) => left.name.localeCompare(right.name));
};

export const listComplaintTaxonomySubcategories = (
  items: readonly ComplaintTaxonomyCatalogItem[],
  primaryCode: string | null,
): ComplaintTaxonomyCatalogItem[] =>
  primaryCode === null
    ? []
    : [...items]
        .filter((item) => item.primaryCode === primaryCode)
        .sort((left, right) => left.subcategoryCode.localeCompare(right.subcategoryCode));

export const getSelectedComplaintTaxonomyItem = (
  items: readonly ComplaintTaxonomyCatalogItem[],
  draft: ComplaintDraft | null,
): ComplaintTaxonomyCatalogItem | null => {
  if (draft === null) return null;

  const primaryCode = draft.customAttributes['taxonomy_primary_code'];
  const subcategoryCode = draft.customAttributes['taxonomy_subcategory_code'];
  const workflowType = draft.customAttributes['taxonomy_workflow_type'];
  if (
    typeof primaryCode !== 'string' ||
    typeof subcategoryCode !== 'string' ||
    typeof workflowType !== 'string'
  ) {
    return null;
  }

  const item = items.find(
    (candidate) =>
      candidate.primaryCode === primaryCode &&
      candidate.subcategoryCode === subcategoryCode &&
      candidate.workflowType === workflowType,
  );
  if (!item || item.routingProfileCategoryId !== draft.categoryId) return null;
  return item;
};

export const formatComplaintWorkflowType = (workflowType: string): string =>
  workflowType
    .toLocaleLowerCase('en-GB')
    .split('_')
    .map((part) => `${part.charAt(0).toLocaleUpperCase('en-GB')}${part.slice(1)}`)
    .join(' ');
