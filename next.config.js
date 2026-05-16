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
    ],
  },
async redirects() {
    return [
      // ✅ KEEP THESE: They safely route traffic from old pages outside of /portfolio
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
      // ❌ REMOVED: The old '/portfolio/:clientSlug/:projectSlug' line is deleted completely
    ];
  },
};

module.exports = nextConfig;
