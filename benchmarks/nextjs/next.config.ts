import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Disable type checking and linting during builds so benchmark timings
  // only measure bundler/compilation speed. Vite does not type-check or
  // lint during build, so this keeps the comparison apples-to-apples.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
