import type { PageCardIcon } from '../../config/pageCards';

/**
 * Lucide icon geometry (ISC licence), copied verbatim from
 * node_modules/lucide-react/dist/esm/icons/*.js at v0.344.
 *
 * Copied rather than imported because the card is drawn by Satori, which
 * renders plain SVG elements but not lucide-react's forwardRef components — and
 * because these are the same icons the site's UI already uses, so the card and
 * the page share one visual vocabulary. All are on a 24x24 grid, stroke-only.
 */
type Shape =
  | { tag: 'path'; d: string }
  | { tag: 'rect'; x: number; y: number; width: number; height: number; rx: number }
  | { tag: 'circle'; cx: number; cy: number; r: number };

export const ICONS: Record<PageCardIcon, Shape[]> = {
  clapperboard: [
    { tag: 'path', d: 'M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z' },
    { tag: 'path', d: 'm6.2 5.3 3.1 3.9' },
    { tag: 'path', d: 'm12.4 3.4 3.1 4' },
    { tag: 'path', d: 'M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z' },
  ],
  'layout-grid': [
    { tag: 'rect', x: 3, y: 3, width: 7, height: 7, rx: 1 },
    { tag: 'rect', x: 14, y: 3, width: 7, height: 7, rx: 1 },
    { tag: 'rect', x: 14, y: 14, width: 7, height: 7, rx: 1 },
    { tag: 'rect', x: 3, y: 14, width: 7, height: 7, rx: 1 },
  ],
  film: [
    { tag: 'rect', x: 3, y: 3, width: 18, height: 18, rx: 2 },
    { tag: 'path', d: 'M7 3v18' },
    { tag: 'path', d: 'M3 7.5h4' },
    { tag: 'path', d: 'M3 12h18' },
    { tag: 'path', d: 'M3 16.5h4' },
    { tag: 'path', d: 'M17 3v18' },
    { tag: 'path', d: 'M17 7.5h4' },
    { tag: 'path', d: 'M17 16.5h4' },
  ],
  'monitor-play': [
    { tag: 'path', d: 'm10 7 5 3-5 3Z' },
    { tag: 'rect', x: 2, y: 3, width: 20, height: 14, rx: 2 },
    { tag: 'path', d: 'M12 17v4' },
    { tag: 'path', d: 'M8 21h8' },
  ],
  'pen-line': [
    { tag: 'path', d: 'M12 20h9' },
    { tag: 'path', d: 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z' },
  ],
  'user-round': [
    { tag: 'circle', cx: 12, cy: 8, r: 5 },
    { tag: 'path', d: 'M20 21a8 8 0 0 0-16 0' },
  ],
  mail: [
    { tag: 'rect', x: 2, y: 4, width: 20, height: 16, rx: 2 },
    { tag: 'path', d: 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7' },
  ],
  'file-text': [
    { tag: 'path', d: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z' },
    { tag: 'path', d: 'M14 2v4a2 2 0 0 0 2 2h4' },
    { tag: 'path', d: 'M10 9H8' },
    { tag: 'path', d: 'M16 13H8' },
    { tag: 'path', d: 'M16 17H8' },
  ],
};
