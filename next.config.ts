import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // wip/ is a local bench (gitignored). It is not a route and must never
  // be served even if someone later drops files under public/wip.
  async rewrites() {
    return [
      { source: "/kidpix/img/:path*", destination: "https://kidpix.app/img/:path*" },
      { source: "/kidpix/sndmp3/:path*", destination: "https://kidpix.app/sndmp3/:path*" },
      { source: "/kidpix/static/:path*", destination: "https://kidpix.app/static/:path*" },
    ];
  },
  async redirects() {
    return [
      { source: "/wip", destination: "/404", permanent: false },
      { source: "/wip/:path*", destination: "/404", permanent: false },
      { source: "/journal", destination: "https://empresstrash.substack.com/", permanent: false },
      { source: "/journal/:path*", destination: "https://empresstrash.substack.com/", permanent: false },
      { source: "/feed", destination: "https://empresstrash.substack.com/", permanent: false },
    ];
  },
};

export default nextConfig;
