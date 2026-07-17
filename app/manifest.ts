import type { MetadataRoute } from "next";

// Web App Manifest — makes the CRM installable on phones ("Add to Home Screen").
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Servian Contracting CRM",
    short_name: "Servian CRM",
    description:
      "Manage clients, projects, quotes, payments and follow-ups for Servian Contracting.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090f",
    theme_color: "#09090f",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
