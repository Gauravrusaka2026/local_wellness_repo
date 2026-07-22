import type { CivicIconName } from './icons';

export type CitizenNavigationItem = Readonly<{
  href: string;
  icon: CivicIconName;
  label: string;
  mobile: boolean;
}>;

export const citizenNavigationItems: readonly CitizenNavigationItem[] = [
  { href: '/', icon: 'home', label: 'Home', mobile: true },
  { href: '/transparency', icon: 'map', label: 'Nearby', mobile: true },
  { href: '/report', icon: 'camera', label: 'Report', mobile: true },
  { href: '/complaints', icon: 'document', label: 'My reports', mobile: true },
  { href: '/directory', icon: 'building', label: 'Directory', mobile: false },
  { href: '/account', icon: 'account', label: 'Account', mobile: true },
] as const;

export const isCitizenNavigationItemActive = (pathname: string, href: string): boolean =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
