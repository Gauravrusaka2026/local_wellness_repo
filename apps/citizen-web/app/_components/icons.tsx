import type { SVGProps } from 'react';

export type CivicIconName =
  | 'account'
  | 'arrow'
  | 'building'
  | 'camera'
  | 'check'
  | 'clock'
  | 'document'
  | 'home'
  | 'location'
  | 'map'
  | 'report'
  | 'search'
  | 'shield'
  | 'spark'
  | 'timeline';

const iconPaths: Readonly<Record<CivicIconName, string>> = {
  account: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0h14Z',
  arrow: 'm9 18 6-6-6-6',
  building: 'M4 21h16M6 21V7l6-4 6 4v14M9 10h2m2 0h2m-6 4h2m2 0h2m-6 4h6',
  camera:
    'M5 7h3l1.5-2h5L16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm7 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  check: 'm5 12 4 4L19 6',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 2',
  document: 'M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6m-6 4h6',
  home: 'm3 11 9-8 9 8v10h-6v-6H9v6H3V11Z',
  location: 'M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Zm-8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  map: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15',
  report: 'M12 3v11m0 4v.01M10 3h4l7 18H3L10 3Z',
  search: 'm21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  shield: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-10 2 2 4-5',
  spark:
    'm12 2 1.4 5.6L19 9l-5.6 1.4L12 16l-1.4-5.6L5 9l5.6-1.4L12 2Zm7 13 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z',
  timeline: 'M5 4v16m0-13h4m-4 5h8m-8 5h12',
};

type CivicIconProperties = Readonly<
  SVGProps<SVGSVGElement> & {
    name: CivicIconName;
    title?: string;
  }
>;

export function CivicIcon({ name, title, ...properties }: CivicIconProperties) {
  return (
    <svg
      aria-hidden={title === undefined}
      className="civic-icon"
      fill="none"
      focusable="false"
      role={title === undefined ? undefined : 'img'}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...properties}
    >
      {title === undefined ? null : <title>{title}</title>}
      <path d={iconPaths[name]} />
    </svg>
  );
}
