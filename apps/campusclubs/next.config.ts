import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Shared workspace packages ship as TypeScript source; Next compiles them.
  transpilePackages: ["@suite/lib", "@suite/ui", "@suite/auth"],
  /* config options here */
};

export default nextConfig;
