import { Baloo_2, JetBrains_Mono, Nunito } from "next/font/google";

export const baloo2 = Baloo_2({
  variable: "--font-baloo",
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
});

export const nunito = Nunito({
  variable: "--font-nunito",
  weight: ["400", "600", "700", "800", "900"],
  subsets: ["latin"],
});

// Mono labels/captions in the brand system (spec numbers, hex codes, small
// annotations) -- see docs/brand guidelines page.
export const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: ["500"],
  subsets: ["latin"],
});
