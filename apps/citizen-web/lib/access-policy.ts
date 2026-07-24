import { getCitizenAccessMode } from './environment';

export const CITIZEN_ACCESS_UNAVAILABLE_PATH = '/access-unavailable';

export type CitizenRouteAccess = 'protected' | 'public';

const isRouteOrDescendant = (pathname: string, route: string): boolean =>
  pathname === route || pathname.startsWith(`${route}/`);

const isFrameworkRoute = (pathname: string): boolean =>
  pathname.startsWith('/_next/') || pathname.startsWith('/.well-known/');

export const getCitizenRouteAccess = (pathname: string): CitizenRouteAccess => {
  if (
    pathname === '/' ||
    isFrameworkRoute(pathname) ||
    isRouteOrDescendant(pathname, '/directory') ||
    isRouteOrDescendant(pathname, '/transparency') ||
    isRouteOrDescendant(pathname, CITIZEN_ACCESS_UNAVAILABLE_PATH)
  ) {
    return 'public';
  }

  return 'protected';
};

export const citizenRouteRequiresSession = (pathname: string): boolean =>
  isRouteOrDescendant(pathname, '/account') || isRouteOrDescendant(pathname, '/complaints');

export class CitizenAccessUnavailableError extends Error {
  public constructor() {
    super('Citizen account features are currently available in the JagrukSetu mobile app.');
    this.name = 'CitizenAccessUnavailableError';
  }
}

export const assertCitizenProtectedAccessAvailable = (): void => {
  if (getCitizenAccessMode() !== 'full') {
    throw new CitizenAccessUnavailableError();
  }
};
