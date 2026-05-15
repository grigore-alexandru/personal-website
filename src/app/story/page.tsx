import type { Metadata } from 'next';
import StoryContent from '../../components/pages/StoryContent';
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '../../config/seo';

export const metadata: Metadata = {
  title: 'Our Story',
  description: 'Learn the story behind Cinematic Studio — our philosophy, our craft, and the people who bring it to life.',
  alternates: {
    canonical: `${SITE_URL}/story`,
  },
  openGraph: {
    title: `Our Story | ${SITE_NAME}`,
    description: 'Learn the story behind Cinematic Studio — our philosophy, our craft, and the people who bring it to life.',
    url: `${SITE_URL}/story`,
    type: 'website',
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Our Story | ${SITE_NAME}`,
    description: 'Learn the story behind Cinematic Studio — our philosophy, our craft, and the people who bring it to life.',
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function StoryPage() {
  return <StoryContent />;
}
