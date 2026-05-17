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
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
  async headers() {
    return [
      {
        // SharedArrayBuffer required by @ffmpeg/ffmpeg in the media compressor
        source: '/admin/compressor',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
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
