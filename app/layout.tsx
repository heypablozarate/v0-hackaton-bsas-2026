import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare } from "geist/font/pixel";
import { Special_Elite } from "next/font/google";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ThemeApplicator from "@/components/ThemeApplicator";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const specialElite = Special_Elite({ subsets: ["latin"], weight: "400", variable: "--font-special-elite" });

export const metadata: Metadata = {
  title: "Terms & Conditions — The Experience",
  description:
    "You've agreed to this 847 times. Have you ever actually read it? Decode any Terms & Conditions and watch the page fall apart.",
  generator: "v0.app",
  icons: {
    icon: "/favicon.jpg",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistMono.variable} ${GeistPixelSquare.variable} ${specialElite.variable} bg-black`}>
      <body className="font-mono antialiased cursor-crosshair">
        <LanguageProvider>
          <ThemeApplicator />
          {children}
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
