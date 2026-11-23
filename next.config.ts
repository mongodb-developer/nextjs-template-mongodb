import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to this project to avoid incorrect root
  // inference when other lockfiles exist higher up the filesystem.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
