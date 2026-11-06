import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: { "/*": ["./node_modules/pdfkit/js/data/*.afm", "./lib/report-documents/assets/*"] },
  outputFileTracingExcludes: {
    "/*": ["./.env*", "./.geo-pilot/**/*", "./.claude/**/*", "./tmp/**/*", "./output/**/*"],
  },
};

export default nextConfig;
