import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import ConditionalHeader from '../components/ConditionalHeader';
import ConditionalWrapper from '../components/ConditionalWrapper';
import { JsonLd } from '../components/seo/JsonLd';
import {
  SITE_URL,
  SITE_NAME,
  SITE_LANG,
  SITE_LOCALE,
  SITE_IN_LANGUAGE,
  SITE_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  PERSON_ID,
  WEBSITE_ID,
} from '../config/site';
import './globals.css';

// 400/600/700 only. The design tokens reference no other weights, and every
// extra weight costs another render-blocking <link rel="preload"> woff2 on
// every page — five of them were being emitted for three that were used.
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: '%s | Alexandru Grigore',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  // Defaults for any route that does not build its own via buildMetadata().
  // Note that a page-level `openGraph` replaces this object wholesale rather
  // than merging into it — which is exactly why buildMetadata() exists.
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    url: SITE_URL,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        secureUrl: DEFAULT_OG_IMAGE,
        type: 'image/jpeg',
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: [
      // .ico first: Google Search does not read SVG favicons.
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#0f1115',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={SITE_LANG} className={poppins.variable}>
      <head>
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://player.vimeo.com" />
        <link rel="preconnect" href="https://images.pexels.com" />
        <link
          rel="preconnect"
          href="https://lqbyvubbzexujviflunv.supabase.co"
        />
        <link rel="preconnect" href="https://s3.eu-central-1.s4.mega.io" />
      </head>
      <body className="font-[family-name:var(--font-poppins)]">
        {/* Site-level graph, emitted once. Every page's own JSON-LD refers back
            to these two @ids rather than restating the publisher inline. */}
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebSite',
                '@id': WEBSITE_ID,
                url: SITE_URL,
                name: SITE_NAME,
                description: SITE_DESCRIPTION,
                inLanguage: SITE_IN_LANGUAGE,
                publisher: { '@id': PERSON_ID },
              },
              {
                '@type': 'Person',
                '@id': PERSON_ID,
                name: SITE_NAME,
                url: SITE_URL,
                jobTitle: 'Video Director & Creative Producer',
                image: DEFAULT_OG_IMAGE,
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: 'Bucharest',
                  addressCountry: 'RO',
                },
                // `sameAs` is deliberately absent: src/app/contact/page.tsx
                // still carries placeholder social URLs (https://instagram.com/
                // with no handle). Pointing sameAs at those would be worse than
                // omitting it — add them here once the real profiles are in.
              },
            ],
          }}
        />
        <ConditionalHeader />
        <ConditionalWrapper>
          {children}
        </ConditionalWrapper>
      </body>
    </html>
  );
}
