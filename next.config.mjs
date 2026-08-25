/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/cookbook',
  // Do NOT set assetPrefix. Setting it (even conditionally for production)
  // causes Vercel to stop emitting the ?dpl=dpl_... deployment-pinning
  // query param on asset URLs. During a deploy the edge propagation
  // window leaves cached HTML pointing at new-hash assets while the
  // Vercel CDN is still serving the previous deployment — without dpl_,
  // those asset requests 404 instead of resolving to the correct build.
  // The origin-host leak in _next/static URLs is a weaker SEO signal
  // than the deploy-safety cost of removing deployment pinning.
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
