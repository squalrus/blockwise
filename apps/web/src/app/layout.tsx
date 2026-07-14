import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";
import { baloo2, jetbrainsMono, nunito } from "@blockwise/ui";
import { SITE_URL } from "@/lib/siteUrl";
import { SiteChrome } from "./SiteChrome";
import "./globals.css";

// Mirrors lib/theme.ts's storage key and apply logic in plain JS so the
// forced light/dark preference (if any) is applied before first paint --
// importing the module here would still hydrate too late to avoid a flash
// of the wrong theme.
const THEME_INIT_SCRIPT = `
try {
  var stored = localStorage.getItem("blockwise_theme");
  if (stored === "light" || stored === "dark") {
    document.documentElement.dataset.theme = stored;
  }
} catch (e) {}
`;

const title = "Spored";
const description = "Hyperlocal neighborhood discovery app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: `%s — ${title}`,
  },
  description,
  openGraph: {
    title,
    description,
    siteName: title,
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

// Matches --nav's cocoa in both themes, so the browser/OS chrome (mobile
// status bar, PWA splash) stays on-brand instead of defaulting to white.
export const viewport: Viewport = {
  themeColor: "#2B1B12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${baloo2.variable} ${nunito.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <SiteChrome>{children}</SiteChrome>
      </body>
      {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
      )}
    </html>
  );
}
