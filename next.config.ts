import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return ["/signup", "/forgot-password", "/reset-password"].map((source) => ({
      source,
      destination: "/login",
      permanent: false,
    }));
  },
};

export default nextConfig;
