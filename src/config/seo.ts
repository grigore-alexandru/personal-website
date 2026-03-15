export const SITE_NAME = 'Cinematic Studio';
export const SITE_URL = 'https://yoursite.com';
export const SITE_DESCRIPTION =
  'Award-winning video production studio specializing in cinematic storytelling. Explore a portfolio of advertisements, documentaries, and commercial productions.';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;

export interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogType?: string;
  ogImage?: string;
  structuredData?: Record<string, unknown>;
}

export const defaultSEO: Required<Omit<SEOProps, 'structuredData'>> = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  canonicalUrl: SITE_URL,
  ogType: 'website',
  ogImage: DEFAULT_OG_IMAGE,
};
