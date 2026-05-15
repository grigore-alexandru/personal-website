import type { Metadata } from 'next';
import HomePageContent from '../components/pages/HomePageContent';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, DEFAULT_OG_IMAGE } from '../config/seo';

export const metadata: Metadata = {
  title: 'Cinematic Studio',
  description: 'Award-winning video production studio specializing in cinematic storytelling. Explore a portfolio of advertisements, documentaries, and commercial productions.',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: `Cinematic Studio | ${SITE_NAME}`,
    description: 'Award-winning video production studio specializing in cinematic storytelling. Explore a portfolio of advertisements, documentaries, and commercial productions.',
    url: SITE_URL,
    type: 'website',
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Cinematic Studio | ${SITE_NAME}`,
    description: 'Award-winning video production studio specializing in cinematic storytelling.',
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function Page() {
  return <HomePageContent />;
}
