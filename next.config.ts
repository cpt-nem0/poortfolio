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
    ];
  },
};

export default nextConfig;
