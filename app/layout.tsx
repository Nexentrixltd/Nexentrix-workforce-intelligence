import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { inter, triakis } from "@/lib/fonts";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/components/providers/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nexentrix",
  description: "Nexentrix workforce intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${triakis.variable}`}>
      <head>
        <link rel="icon" href="/assets/logo-mark-white.svg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Toaster richColors position="top-right" closeButton />
          <QueryProvider>
            {children}
          </QueryProvider>

        </ThemeProvider>
      </body>
    </html>
  );
}
