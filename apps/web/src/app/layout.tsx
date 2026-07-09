import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import Script from "next/script";
import { AccountNav } from "./AccountNav";
import { Footer } from "./Footer";
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

const baloo2 = Baloo_2({
  variable: "--font-baloo",
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  weight: ["400", "600", "700", "800", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spored",
  description: "Hyperlocal neighborhood discovery app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${baloo2.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <AccountNav />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
