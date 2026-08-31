import Link from 'next/link';
import { ArrowLeft, FileX } from 'lucide-react';
import { designTokens } from '../../../styles/tokens';

/**
 * Scoped 404 for the /documents/[slug] segment — Next.js renders this
 * instead of the global not-found.tsx whenever notFound() is thrown inside
 * this route, since it's closer in the tree. Same visual language as the
 * global one (see src/app/not-found.tsx), swapped to the documents context.
 * This route is chromeless (see isChromelessRoute.ts), so there's no site
 * header above this — the page fills the viewport on its own.
 */
export const metadata = {
  title: 'Document Not Found',
  robots: { index: false, follow: false },
};

export default function DocumentNotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-surface-base">
      <div className="text-center max-w-lg animate-fade-in-up">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-50 flex items-center justify-center">
          <FileX size={36} className="text-primary-500" aria-hidden="true" />
        </div>

        <h1
          className="text-black mb-3"
          style={{
            fontSize: designTokens.typography.sizes.md,
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.bold,
            lineHeight: designTokens.typography.lineHeights.heading,
          }}
        >
          This document isn&apos;t here.
        </h1>

        <p
          className="text-neutral-500 mb-9"
          style={{
            fontSize: designTokens.typography.sizes.sm,
            fontFamily: designTokens.typography.fontFamily,
            lineHeight: designTokens.typography.lineHeights.body,
          }}
        >
          The PDF you&apos;re looking for may have been moved, renamed, or removed.
          Double-check the link, or head back to the homepage.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-3 rounded-full px-10 py-5 text-lg font-bold bg-display text-white shadow-lg transition-all duration-300 hover:bg-accent hover:shadow-xl hover:scale-[1.03] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-display focus-visible:ring-offset-2"
        >
          <ArrowLeft size={20} className="flex-shrink-0" />
          Back to the homepage
        </Link>
      </div>
    </main>
  );
}
