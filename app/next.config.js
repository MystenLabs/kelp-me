/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});
const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Limit Next.js workspace root detection to this project to avoid reading parent lockfiles/configs
  outputFileTracingRoot: path.join(__dirname, ".."),
  eslint: {
    // Avoid failing builds due to ESLint trying to read configs outside the project root
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

module.exports = nextConfig;
