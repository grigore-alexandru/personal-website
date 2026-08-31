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
};

module.exports = nextConfig;
