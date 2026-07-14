import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { baloo2, jetbrainsMono, nunito } from "@blockwise/ui";
import { SITE_URL } from "@/lib/siteUrl";
import "./globals.css";

const title = "Spored";
const description =
  "Discover what's happening in your neighborhood — check in to local businesses, earn badges, and connect with neighbors.";

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
    url: "/",
    siteName: title,
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

// Matches the nav/footer's cocoa background so mobile browser chrome stays
// on-brand instead of defaulting to white.
export const viewport: Viewport = {
  themeColor: "#2B1B12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${baloo2.variable} ${nunito.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
      {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
      )}
    </html>
  );
}
