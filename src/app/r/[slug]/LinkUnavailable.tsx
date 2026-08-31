import Link from 'next/link';
import { designTokens } from '../../../styles/tokens';

/**
 * Shown when a slug is unknown, archived, paused, expired, or past its click
 * limit — deliberately the same page for all of them, so a stranger poking at
 * slugs learns nothing about which links exist.
 *
 * Standalone by design: no site nav or footer. Someone who lands here scanned a
 * dead QR code; the fastest thing we can do is say so and offer the way home.
 */
export function LinkUnavailable() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
      <div className="text-center max-w-md">
        <h1
          className="text-black mb-3"
          style={{
            fontSize: designTokens.typography.sizes.lg,
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.bold,
            lineHeight: designTokens.typography.lineHeights.heading,
            letterSpacing: '-0.01em',
          }}
        >
          This link isn&apos;t available
        </h1>

        <p
          className="text-neutral-500 mb-8"
          style={{
            fontSize: designTokens.typography.sizes.sm,
            fontFamily: designTokens.typography.fontFamily,
            lineHeight: designTokens.typography.lineHeights.body,
          }}
        >
          It may have expired, been paused, or never existed.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors"
          style={{
            fontSize: designTokens.typography.sizes.sm,
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.medium,
          }}
        >
          Go to alexandrugrigore.com
        </Link>
      </div>
    </main>
  );
}
