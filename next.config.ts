import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    // Enable source maps in development
    if (dev) {
      config.devtool = 'source-map'
    }
    return config
  }
  /* config options here */
};

export default nextConfig;
