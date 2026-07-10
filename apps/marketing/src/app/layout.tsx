import type { Metadata, Viewport } from "next";
import { baloo2, jetbrainsMono, nunito } from "@blockwise/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spored",
  description: "Hyperlocal neighborhood discovery app",
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
    </html>
  );
}
