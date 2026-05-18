import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" output is for self-hosted (VPS/Docker) deployments
  // For Vercel, we do NOT use standalone — Vercel handles the build itself
  // Uncomment the next line ONLY for self-hosted deployment:
  // output: "standalone",

  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,

  // Allow external images if needed
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
