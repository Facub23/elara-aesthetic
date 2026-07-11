import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",

      allow: [
        "/",
        "/clinics",
        "/especialistas",
        "/tratamientos",
        "/privacidad",
        "/terminos",
        "/aviso-legal",
        "/cookies",
      ],

      disallow: [
        "/dashboard",
        "/mi-cuenta",
        "/cancel-booking",
        "/confirm-booking",
        "/review",
        "/reserva",
        "/login",
        "/admin",
        "/api",
      ],
    },

    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
