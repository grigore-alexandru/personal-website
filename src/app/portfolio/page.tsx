import type { Metadata } from 'next';
import PortfolioLandingContent from './PortfolioLandingContent';
import { buildMetadata } from '../../lib/seo';
import { PAGE_CARDS } from '../../config/pageCards';

export const metadata: Metadata = buildMetadata({
  title: 'Portfolio',
  description: PAGE_CARDS.portfolio.description,
  card: 'portfolio',
  path: '/portfolio',
});

export default function PortfolioPage() {
  return <PortfolioLandingContent />;
}
