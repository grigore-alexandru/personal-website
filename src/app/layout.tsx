import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import ConditionalHeader from '../components/ConditionalHeader';
import ConditionalWrapper from '../components/ConditionalWrapper';
import { SITE_URL } from '../config/site';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: {
    default: 'Alexandru Grigore',
    template: '%s | Alexandru Grigore',
  },
  description: 'Video director and creative producer. Commercials, documentaries, and branded content.',
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: 'website',
    siteName: 'Alexandru Grigore',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable}>
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
        <ConditionalHeader />
        <ConditionalWrapper>
          {children}
        </ConditionalWrapper>
      </body>
    </html>
  );
}
