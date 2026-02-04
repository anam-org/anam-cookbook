/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/cookbook',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/cookbook',
        basePath: false,
        permanent: false,
      },
    ];
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
      },
    ],
  },
};

export default nextConfig;
