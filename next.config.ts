import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/", destination: "/start", permanent: false },
      // The old start flow and the unsaved plan page now end at step 4. The query string passes through.
      ...["/start/review", "/start/tools", "/start/go", "/plan"].map(source => ({ source, destination: "/start/needs", permanent: false })),
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
