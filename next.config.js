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
  
module.exports = nextConfig;
