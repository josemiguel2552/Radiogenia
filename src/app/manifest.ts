import type { MetadataRoute } from "next";

// Makes Radiogen.AI installable as a desktop/taskbar app straight from the
// browser (Chrome/Edge "Install app") — a standalone window with a desktop
// icon, no separate build or native installer, zero change to the site itself.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Radiogen.AI",
    short_name: "Radiogen.AI",
    description: "Informes radiológicos con IA — dictado por voz, plantillas y estadiaje automático.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0a1a",
    theme_color: "#0a0a1a",
    orientation: "any",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
