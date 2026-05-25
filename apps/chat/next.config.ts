import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pure static export — the entire app will run client-side, no backend.
  // Toggle this on once the mock is functional and we're ready to ship.
  // output: "export",
  reactStrictMode: true,
};

export default nextConfig;
