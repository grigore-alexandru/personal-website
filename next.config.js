/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.eu-central-1.s4.mega.io',
      },
      {
        protocol: 'https',
        // Mega S4's generic/global edge host — some asset URLs resolve here
        // instead of the region-specific host above.
        hostname: 's3.g.s4.mega.io',
      },
      {
        protocol: 'https',
        hostname: 'lqbyvubbzexujviflunv.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
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
