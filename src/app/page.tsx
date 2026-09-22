import type { Metadata } from 'next';
import UnderConstruction from '../components/pages/UnderConstruction';
import { SITE_NAME } from '../config/site';
import { buildMetadata } from '../lib/seo';
import { PAGE_CARDS } from '../config/pageCards';

export const metadata: Metadata = {
  ...buildMetadata({
    title: SITE_NAME,
    description: PAGE_CARDS.home.description,
    card: 'home',
    path: '',
  }),
  // absolute bypasses the root template so the tab reads "Alexandru Grigore"
  // rather than "Alexandru Grigore | Alexandru Grigore".
  title: { absolute: SITE_NAME },
};

export default function Page() {
  return <UnderConstruction />;
}
