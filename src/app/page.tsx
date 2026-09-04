import type { Metadata } from 'next';
import UnderConstruction from '../components/pages/UnderConstruction';
import { SITE_NAME } from '../config/site';
import { buildMetadata } from '../lib/seo';

const DESCRIPTION =
  'Video director and creative producer. I work with brands, agencies, and artists on commercials, documentaries, and visual content.';

export const metadata: Metadata = {
  ...buildMetadata({
    title: SITE_NAME,
    description: DESCRIPTION,
    path: '',
  }),
  // absolute bypasses the root template so the tab reads "Alexandru Grigore"
  // rather than "Alexandru Grigore | Alexandru Grigore".
  title: { absolute: SITE_NAME },
};

export default function Page() {
  return <UnderConstruction />;
}
