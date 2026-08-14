import type { MetadataRoute } from "next";

// Next's typed manifest route (BACKLOG.md Ref 89) -- served at /manifest.webmanifest
// and auto-linked into <head> by the App Router, no explicit <link> needed.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Spored",
    short_name: "Spored",
    description: "Hyperlocal neighborhood discovery app",
    start_url: "/",
    display: "standalone",
    // Matches --nav's cocoa (layout.tsx's viewport.themeColor) and the
    // icon.svg background so the install splash/task-switcher chrome doesn't
    // flash a mismatched color before the app itself paints.
    background_color: "#2B1B12",
    theme_color: "#2B1B12",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
