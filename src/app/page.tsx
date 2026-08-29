import type { Metadata } from 'next';
import UnderConstructionPage from './under-construction/page';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, DEFAULT_OG_IMAGE } from '../config/site';

export const metadata: Metadata = {
  // absolute bypasses the root template so the tab reads "Alexandru Grigore"
  // rather than "Alexandru Grigore | Alexandru Grigore".
  title: { absolute: SITE_NAME },
  description: 'Video director and creative producer. I work with brands, agencies, and artists on commercials, documentaries, and visual content.',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: SITE_NAME,
    description: 'Video director and creative producer. Commercials, documentaries, and branded content.',
    url: SITE_URL,
    type: 'website',
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: 'Video director and creative producer. Commercials, documentaries, and branded content.',
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function Page() {
  return <UnderConstructionPage />;
}
