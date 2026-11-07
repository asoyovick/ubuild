import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async rewrites() {
    const backend =
      process.env.UBUILD_API_URL &&
      process.env.UBUILD_API_URL !== "http://127.0.0.1:8080"
        ? process.env.UBUILD_API_URL
        : "http://localhost:8080";
    return [{ source: "/api/backend/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
