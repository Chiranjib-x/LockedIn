import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Shared workspace packages ship as TypeScript source; Next compiles them.
  transpilePackages: ["@suite/ui", "@suite/lib", "@suite/auth"],
};

export default nextConfig;
