import type { Metadata } from 'next';
import PortfolioLandingContent from './PortfolioLandingContent';
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '../../config/site';

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Projects and work I\'m proud of, across clients and formats.',
  alternates: {
    canonical: `${SITE_URL}/portfolio`,
  },
  openGraph: {
    title: `Portfolio | ${SITE_NAME}`,
    description: 'Projects and work I\'m proud of, across clients and formats.',
    url: `${SITE_URL}/portfolio`,
    type: 'website',
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Portfolio | ${SITE_NAME}`,
    description: 'Projects and work I\'m proud of, across clients and formats.',
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function PortfolioPage() {
  return <PortfolioLandingContent />;
}
