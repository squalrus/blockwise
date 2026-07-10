import type { Metadata } from "next";
import { baloo2, nunito } from "@blockwise/ui";
import "./globals.css";

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
    <html lang="en" className={`${baloo2.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
