// The one list of remote image hosts, shared with src/app/og/route.ts and
// scripts/check-metadata.mjs. See image-hosts.README.md for why it is a file
// and not three hand-synced copies.
const IMAGE_HOSTS = require('./image-hosts.json');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: IMAGE_HOSTS.map((hostname) => ({ protocol: 'https', hostname })),
  },
  async redirects() {
    return [
      {
        source: '/what-i-do/video-production',
        destination: '/portfolio/projects',
        permanent: true,
      },
      {
        source: '/what-i-do/video-production/:path*',
        destination: '/portfolio/projects',
        permanent: true,
      },
    ];
  },
  webpack: (config) => {
    // pdfjs-dist (via react-pdf) conditionally requires the `canvas` native
    // Node addon for its server-side code path. Webpack still tries to
    // resolve it for the client bundle, which throws a cryptic
    // "Object.defineProperty called on non-object" at runtime — this is the
    // standard fix documented by both projects for use under Next.js/webpack.
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
  experimental: {
    // The item-card route renders on demand for a post published after the
    // last build, so its serverless function needs the vendored fonts. The
    // path is built at runtime (`Poppins-${weight}.ttf`), which Next's file
    // tracing cannot follow, so include them explicitly.
    outputFileTracingIncludes: {
      '/og/item/[type]/[slug]': ['./src/assets/fonts/**'],
    },
    // Next.js 14's bundled webpack has an ESM/CJS interop bug that crashes
    // pdfjs-dist v5's self-bundled pdf.mjs at import time with
    // "Object.defineProperty called on non-object" (webpack/webpack#20095,
    // fixed upstream in webpack 5.103.0 — newer than what Next 14 ships).
    // `esmExternals: 'loose'` is the documented workaround until either Next
    // upgrades its bundled webpack or this project moves to Next 15+.
    esmExternals: 'loose',
  },
};

module.exports = nextConfig;
