/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config');

const nextConfig = {
  experimental: {
    appDir: true,
  },
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  env: {
    NEXT_PUBLIC_STELLAR_RECEIVER_ADDRESS: process.env.NEXT_PUBLIC_STELLAR_RECEIVER_ADDRESS,
  },
  i18n,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
