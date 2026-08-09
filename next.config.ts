import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: "/3am",
        destination: "/",
        permanent: true,
      },
      {
        // `/boring` was this page's original name — it's been shared publicly,
        // so the old URL keeps working.
        source: "/boring",
        destination: "/9am",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
