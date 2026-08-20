import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // wip/ is a local bench (gitignored). It is not a route and must never
  // be served even if someone later drops files under public/wip.
  async redirects() {
    return [
      { source: "/wip", destination: "/404", permanent: false },
      { source: "/wip/:path*", destination: "/404", permanent: false },
    ];
  },
};

export default nextConfig;
