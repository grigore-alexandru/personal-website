import Link from 'next/link';
import { ArrowLeft, Camera, Film, Clapperboard } from 'lucide-react';
import { designTokens } from '../styles/tokens';

/**
 * Global 404. Next.js renders this for any unmatched route, and for every
 * in-app notFound() call that doesn't define its own closer not-found.tsx —
 * so this one file covers every "page not found" case on the site.
 *
 * Deliberately a Server Component: the animation is pure CSS (see globals.css,
 * ".fof-*" rules), so nothing here needs a client bundle to run.
 */
export const metadata = {
  title: 'Page Not Found',
  robots: { index: false, follow: false },
};

const quickLinks = [
  { label: 'Portfolio', href: '/portfolio', icon: Film },
  { label: 'Blog', href: '/blog', icon: Clapperboard },
  { label: 'Story', href: '/story', icon: Camera },
];

export default function NotFound() {
  return (
    <main className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6 py-16 bg-surface-base">
      <div className="text-center max-w-lg animate-fade-in-up">
        {/* The bouncing blob */}
        <div className="fof-stage mb-6" aria-hidden="true">
          <div className="fof-track">
            <div className="fof-bounce">
              <div className="fof-body">
                <div className="fof-eye">
                  <div className="fof-pupil" />
                  <div className="fof-lid" />
                </div>
                <div className="fof-eye">
                  <div className="fof-pupil" />
                  <div className="fof-lid" />
                </div>
              </div>
              <div className="fof-shadow" />
            </div>
          </div>
        </div>

        <p
          className="text-primary-500 mb-2"
          style={{
            fontSize: designTokens.typography.sizes.xxl,
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.bold,
            lineHeight: designTokens.typography.lineHeights.tight,
            letterSpacing: designTokens.typography.letterSpacings.tight,
          }}
        >
          404
        </p>

        <h1
          className="text-black mb-3"
          style={{
            fontSize: designTokens.typography.sizes.md,
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.bold,
            lineHeight: designTokens.typography.lineHeights.heading,
          }}
        >
          Cut! We couldn&apos;t find that scene.
        </h1>

        <p
          className="text-neutral-500 mb-9"
          style={{
            fontSize: designTokens.typography.sizes.sm,
            fontFamily: designTokens.typography.fontFamily,
            lineHeight: designTokens.typography.lineHeights.body,
          }}
        >
          The page you&apos;re looking for must be on the cutting room floor.
          It happens to the best productions — let&apos;s get you back on set.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-3 rounded-full px-10 py-5 text-lg font-bold bg-display text-white shadow-lg transition-all duration-300 hover:bg-accent hover:shadow-xl hover:scale-[1.03] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-display focus-visible:ring-offset-2"
        >
          <ArrowLeft size={20} className="flex-shrink-0" />
          Back to the homepage
        </Link>

        <div className="mt-10 pt-8 border-t border-neutral-200 flex items-center justify-center gap-6 flex-wrap">
          {quickLinks.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-black transition-colors"
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
