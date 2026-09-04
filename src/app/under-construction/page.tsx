import type { Metadata } from 'next';
import UnderConstruction from '../../components/pages/UnderConstruction';

/**
 * Server Component wrapper. The placeholder itself needs 'use client' for
 * framer-motion, and a client page cannot export metadata — so the route stays
 * a server file and the animation lives in the component.
 *
 * noindex because this URL renders byte-for-byte the same page as / and /story.
 * Only the homepage should be in the index while the placeholder is up.
 */
export const metadata: Metadata = {
  title: 'Under Construction',
  robots: { index: false, follow: false },
};

export default function UnderConstructionPage() {
  return <UnderConstruction />;
}
