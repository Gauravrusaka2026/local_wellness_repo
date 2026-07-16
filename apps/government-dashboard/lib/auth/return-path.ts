export const getSafeReturnPath = (value: string | null | undefined, fallback: string): string => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  try {
    const parsed = new URL(value, 'https://local-wellness.invalid');
    return parsed.origin === 'https://local-wellness.invalid'
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : fallback;
  } catch {
    return fallback;
  }
};

export const getSafeMfaReturnPath = (
  value: string | null | undefined,
  fallback: string,
): string => {
  const returnPath = getSafeReturnPath(value, fallback);

  if (returnPath === '/auth' || returnPath.startsWith('/auth/')) {
    return fallback;
  }

  return returnPath;
};
