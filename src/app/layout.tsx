import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { Providers } from './providers';
import Header from '../components/Header';
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
  description: '',
  metadataBase: new URL('https://sweet-vacherin-65bc21.netlify.app'),
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
        <Providers>
          <Header />
          <div className="pt-[80px]">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
