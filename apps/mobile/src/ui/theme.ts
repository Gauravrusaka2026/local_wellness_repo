/**
 * Compact mobile tokens. These mirror the shared civic palette while keeping
 * React Native values numeric and directly consumable by StyleSheet.
 */
export const mobileTheme = {
  colors: {
    accent: '#E77817',
    accentSoft: '#FFF1E5',
    background: '#F7FAF8',
    border: '#D7E3DC',
    danger: '#A12626',
    dangerSoft: '#FDEDED',
    focus: '#0B6EFD',
    info: '#1769AA',
    infoSoft: '#EAF3FB',
    muted: '#64756B',
    nav: '#063B22',
    navMuted: '#A9BDB1',
    primary: '#17683B',
    primaryDark: '#0E4D2B',
    primarySoft: '#EAF4ED',
    success: '#16834A',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF5F1',
    text: '#14281D',
    warning: '#A85B0B',
    warningSoft: '#FFF4DD',
    white: '#FFFFFF',
  },
  radius: {
    full: 999,
    large: 18,
    medium: 14,
    small: 10,
  },
  shadow: {
    floating: {
      boxShadow: '0 5px 16px rgba(6, 46, 27, 0.20)',
    },
    surface: {
      boxShadow: '0 2px 8px rgba(23, 58, 39, 0.08)',
    },
  },
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
  },
  type: {
    body: 14,
    bodyLineHeight: 20,
    caption: 11,
    display: 24,
    heading: 18,
    helper: 12,
    label: 14,
    nav: 10,
    title: 22,
  },
} as const;

export type MobileTheme = typeof mobileTheme;
