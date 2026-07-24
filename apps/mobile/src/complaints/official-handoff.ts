import type { ComplaintHandoffAction } from '@local-wellness/types';

export type OfficialHandoffLaunchers = Readonly<{
  openBrowser: (url: string) => Promise<void>;
  openCall: (url: string) => Promise<unknown>;
}>;

const phoneNumberPattern = /^[0-9]{3,15}$/u;

const isSecureHttpsUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname.length > 0 &&
      url.username.length === 0 &&
      url.password.length === 0
    );
  } catch {
    return false;
  }
};

export const getOfficialHandoffTarget = (
  action: ComplaintHandoffAction,
): Readonly<{ kind: 'browser' | 'call'; url: string }> => {
  if (action.kind === 'call' && phoneNumberPattern.test(action.target)) {
    return { kind: 'call', url: `tel:${action.target}` };
  }

  if (action.kind === 'browser' && isSecureHttpsUrl(action.target)) {
    return { kind: 'browser', url: action.target };
  }

  throw new Error('The official help action is not a safe call or HTTPS link.');
};

export const openOfficialHandoffAction = async (
  action: ComplaintHandoffAction,
  launchers: OfficialHandoffLaunchers,
): Promise<void> => {
  const target = getOfficialHandoffTarget(action);
  if (target.kind === 'call') {
    await launchers.openCall(target.url);
    return;
  }

  await launchers.openBrowser(target.url);
};
