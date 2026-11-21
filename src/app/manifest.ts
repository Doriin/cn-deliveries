import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CN Deliveries — Curier",
    short_name: "CN Curier",
    start_url: "/courier",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c1a2b",
    theme_color: "#0c1a2b",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
