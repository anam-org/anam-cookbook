import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Next.js scoped to this example when it is run inside the cookbook repo.
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
