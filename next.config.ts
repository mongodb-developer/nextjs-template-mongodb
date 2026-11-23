import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent automatic instruction-file generation.
  agentRules: false,
  // Keep workspace detection within this project.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
