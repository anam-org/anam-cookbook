/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/cookbook',
  // Serve assets from the canonical host on production so the HTML doesn't
  // reference anam-cookbook.vercel.app (weakens the canonical signal and
  // shows the origin host to crawlers). Preview deploys and local dev use
  // the default so assets load from the host the page is served from.
  assetPrefix:
    process.env.VERCEL_ENV === 'production'
      ? 'https://anam.ai/cookbook'
      : undefined,
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
