import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "eqztgdhhhhrmdfvlgnhx.supabase.co" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
