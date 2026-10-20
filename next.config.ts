import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page reads the login cookie, so pages are rendered per request.
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
