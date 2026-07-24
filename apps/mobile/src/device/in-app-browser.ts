export type InAppBrowserErrorCode = 'invalid_url' | 'open_failed';

export class InAppBrowserError extends Error {
  readonly code: InAppBrowserErrorCode;

  constructor(code: InAppBrowserErrorCode, message: string) {
    super(message);
    this.name = 'InAppBrowserError';
    this.code = code;
  }
}

export type InAppBrowserLauncher = (url: string) => Promise<unknown>;

const invalidUrlMessage = 'This link is not a secure HTTPS address.';
const openFailedMessage = 'This secure link could not be opened. Please try again.';

const expoInAppBrowserLauncher: InAppBrowserLauncher = async (url) => {
  const webBrowser = await import('expo-web-browser');
  return webBrowser.openBrowserAsync(url, {
    controlsColor: '#1565c0',
    dismissButtonStyle: 'close',
    enableDefaultShareMenuItem: false,
    showTitle: true,
    toolbarColor: '#ffffff',
  });
};

export const normalizeSecureExternalUrl = (value: string): string => {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new InAppBrowserError('invalid_url', invalidUrlMessage);
  }

  if (
    parsed.protocol !== 'https:' ||
    parsed.hostname.length === 0 ||
    parsed.username.length > 0 ||
    parsed.password.length > 0
  ) {
    throw new InAppBrowserError('invalid_url', invalidUrlMessage);
  }

  return parsed.toString();
};

export const openSecureExternalPage = async (
  value: string,
  launch: InAppBrowserLauncher = expoInAppBrowserLauncher,
): Promise<void> => {
  const url = normalizeSecureExternalUrl(value);

  try {
    await launch(url);
  } catch {
    throw new InAppBrowserError('open_failed', openFailedMessage);
  }
};

export const getUserFacingInAppBrowserError = (error: unknown): string =>
  error instanceof InAppBrowserError ? error.message : openFailedMessage;
