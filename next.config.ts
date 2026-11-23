import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,

  async headers() {
    return [
      {
        /*
         * The compositions are content-addressed by hand: each one is
         * regenerated under a new name by its script in `scripts/` when the
         * art changes, so a given file never changes meaning. That makes them
         * safe to pin immutably, which is what turns a repeat visit into no
         * network at all - the layers are already in the HTTP cache by the
         * time `fetch(..., { cache: "force-cache" })` asks for them.
         */
        source: "/lottie/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
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
