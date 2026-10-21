import { Inter } from "next/font/google";
import localFont from "next/font/local";

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-inter",
  display: "swap",
});

export const triakis = localFont({
  src: [
    {
      path: "../public/fonts/TriakisFont-Regular.otf",
      weight: "400",
    },
  ],
  variable: "--font-triakis",
  display: "swap",
});