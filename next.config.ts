import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  devIndicators: false,
  redirects() {
    return [{ source: "/wizard/:path*", destination: "/pencari/:path*", permanent: true }];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
