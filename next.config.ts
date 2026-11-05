import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  outputFileTracingExcludes: {
    "/*": ["./.env*", "./.geo-pilot/**/*", "./.claude/**/*"],
  },
};

export default nextConfig;
