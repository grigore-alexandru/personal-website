import type { Metadata } from 'next';
import PortfolioLandingContent from './PortfolioLandingContent';
import { buildMetadata } from '../../lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Portfolio',
  description: 'Projects and work I\'m proud of, across clients and formats.',
  path: '/portfolio',
});

export default function PortfolioPage() {
  return <PortfolioLandingContent />;
}
