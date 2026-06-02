import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    const privateHeaders = [
      {
        key: "X-Robots-Tag",
        value: "noindex, nofollow",
      },
    ];

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
      {
        source: "/admin/:path*",
        headers: privateHeaders,
      },
      {
        source: "/api/:path*",
        headers: privateHeaders,
      },
      {
        source: "/dashboard",
        headers: privateHeaders,
      },
      {
        source: "/mi-cuenta",
        headers: privateHeaders,
      },
      {
        source: "/cancel-booking",
        headers: privateHeaders,
      },
      {
        source: "/confirm-booking",
        headers: privateHeaders,
      },
      {
        source: "/review/:path*",
        headers: privateHeaders,
      },
      {
        source: "/reserva/:path*",
        headers: privateHeaders,
      },
      {
        source: "/login",
        headers: privateHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.istockphoto.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "encrypted-tbn0.gstatic.com",
      },
      {
        protocol: "https",
        hostname: "cudim.org",
      },
      {
        protocol: "https",
        hostname: "bxhcxazdfjskuebbufil.supabase.co",
      },
    ],
  },
};

export default nextConfig;
