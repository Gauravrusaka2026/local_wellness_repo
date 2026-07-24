import type { MessageKey } from '@local-wellness/localization';
import type { Href } from 'expo-router';

import type { CivicIconName } from './civic-icon';

export type PrimaryNavigationItem = 'community' | 'complaints' | 'governance' | 'home' | 'menu';
export type VisibleNavigationItem = Exclude<PrimaryNavigationItem, 'governance'>;

export interface PrimaryNavigationConfig {
  readonly color: string;
  readonly icon: CivicIconName;
  readonly key: VisibleNavigationItem;
  readonly labelKey: MessageKey;
  readonly route: Href;
}

export const primaryNavigationItems: readonly PrimaryNavigationConfig[] = [
  {
    color: '#78A98B',
    icon: 'home',
    key: 'home',
    labelKey: 'home',
    route: '/home',
  },
  {
    color: '#78A6C8',
    icon: 'complaint',
    key: 'complaints',
    labelKey: 'complaints',
    route: '/complaints',
  },
  {
    color: '#D89B63',
    icon: 'community',
    key: 'community',
    labelKey: 'community',
    route: '/transparency',
  },
  {
    color: '#8DB29C',
    icon: 'more',
    key: 'menu',
    labelKey: 'more',
    route: '/menu',
  },
] as const;

export function normalizePrimaryNavigationItem(
  current: PrimaryNavigationItem,
): VisibleNavigationItem {
  return current === 'governance' ? 'menu' : current;
}
