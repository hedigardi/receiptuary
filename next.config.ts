import type { NextConfig } from "next";

/**
 * Next.js static export settings for simple static hosting environments.
 */
const nextConfig: NextConfig = {
  output: "export",
  images: {
    // Static export cannot use the default image optimization server.
    unoptimized: true,
  },
};

export default nextConfig;
