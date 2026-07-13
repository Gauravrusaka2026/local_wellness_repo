export const getSafeReturnPath = (value: string | null | undefined, fallback: string): string => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  try {
    const parsed = new URL(value, 'https://local-wellness.invalid');

    if (parsed.origin !== 'https://local-wellness.invalid') {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
};
