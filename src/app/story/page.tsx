import type { Metadata } from 'next';
import UnderConstruction from '../../components/pages/UnderConstruction';
import { buildMetadata } from '../../lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'About',
  description: 'A bit about me — who I am, how I got here, and what drives the work.',
  path: '/story',
  // Still renders the placeholder, and is a byte-for-byte duplicate of / and
  // /under-construction while it does. Keep it out of the index until
  // StoryContent.tsx is actually wired up; it is also dropped from sitemap.ts.
  noindex: true,
});

export default function StoryPage() {
  return <UnderConstruction />;
}
