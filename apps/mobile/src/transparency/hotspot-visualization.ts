import type { PublicComplaintHotspot, PublicTransparencyViewport } from '@local-wellness/types';

import { projectApproximatePoint } from './nearby-viewport';

export type HotspotVisual = Readonly<{
  complaintCount: number;
  diameter: number;
  id: string;
  intensity: number;
  xPercent: number;
  yPercent: number;
}>;

export const buildHotspotVisuals = (
  items: readonly PublicComplaintHotspot[],
  viewport: PublicTransparencyViewport,
): readonly HotspotVisual[] => {
  const maximumCount = Math.max(1, ...items.map(({ complaintCount }) => complaintCount));
  return items.map((item) => {
    const point = projectApproximatePoint(item.location, viewport);
    const relativeDensity = Math.sqrt(item.complaintCount / maximumCount);
    return {
      complaintCount: item.complaintCount,
      diameter: Math.round(36 + relativeDensity * 48),
      id: item.id,
      intensity: Math.round((0.28 + relativeDensity * 0.48) * 100) / 100,
      xPercent: point.xPercent,
      yPercent: point.yPercent,
    };
  });
};
