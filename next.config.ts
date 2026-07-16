import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer", "node-vibrant", "cheerio"],
};

export default nextConfig;
