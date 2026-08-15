import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright / curl often use 127.0.0.1 while `next dev` binds as localhost.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Django posts to `/send/`; without this, Next 308-redirects `/send/` → `/send`
  // before rewrites and can drop the POST body.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    // Secret Django admin path uses `$ ( ) !` — handled in middleware.ts
    // (path-to-regexp treats `$` specially, so do not put that path here).
    return [
      {
        source: "/fetchCustomer",
        destination: "/api/fetchCustomer",
      },
      {
        source: "/send",
        destination: "/api/send",
      },
      {
        source: "/send/",
        destination: "/api/send",
      },
    ];
  },
};

export default nextConfig;
