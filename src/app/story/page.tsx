import type { Metadata } from 'next';
import UnderConstructionPage from '../under-construction/page';
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '../../config/site';

export const metadata: Metadata = {
  title: 'About',
  description: 'A bit about me — who I am, how I got here, and what drives the work.',
  alternates: {
    canonical: `${SITE_URL}/story`,
  },
  openGraph: {
    title: `About | ${SITE_NAME}`,
    description: 'A bit about me — who I am, how I got here, and what drives the work.',
    url: `${SITE_URL}/story`,
    type: 'website',
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `About | ${SITE_NAME}`,
    description: 'A bit about me — who I am, how I got here, and what drives the work.',
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function StoryPage() {
  return <UnderConstructionPage />;
}
