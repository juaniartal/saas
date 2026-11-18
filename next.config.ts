import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // Export static HTML/JS files to `out/` (served by FastAPI in the AWS container)
  images: {
    unoptimized: true  // Required for static export
  },
  // Keep this: it is what processes Tailwind CSS (the project has no postcss.config)
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  reactStrictMode: true,
};

export default nextConfig;
