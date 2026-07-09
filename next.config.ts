import type { NextConfig } from "next";

// Absolute prefix so Capacitor WebViews resolve /_next assets correctly.
// Override with NEXT_PUBLIC_ASSET_PREFIX for CDN or a different host.
const assetPrefix =
  process.env.NEXT_PUBLIC_ASSET_PREFIX ?? "http://192.168.1.14:3000";

const nextConfig: NextConfig = {
  assetPrefix,
};

export default nextConfig;
