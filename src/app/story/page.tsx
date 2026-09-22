import type { Metadata } from 'next';
import UnderConstruction from '../../components/pages/UnderConstruction';
import { buildMetadata } from '../../lib/seo';
import { PAGE_CARDS } from '../../config/pageCards';

export const metadata: Metadata = buildMetadata({
  title: 'About',
  description: PAGE_CARDS.about.description,
  card: 'about',
  path: '/story',
  // Still renders the placeholder, and is a byte-for-byte duplicate of / and
  // /under-construction while it does. Keep it out of the index until
  // StoryContent.tsx is actually wired up; it is also dropped from sitemap.ts.
  noindex: true,
});

export default function StoryPage() {
  return <UnderConstruction />;
}
