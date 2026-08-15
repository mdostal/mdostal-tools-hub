import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/site-config";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Absolute URLs throughout, not metadataBase + relative paths -- same
// explicit-absolute-URL approach used by every child tool's own metadata
// (e.g. medical-study-tracker's app/layout.tsx), so there's no ambiguity
// about how a relative path would resolve.

// favicon.ico + apple-icon.png live in this directory (Next's automatic
// file-based icon convention) -- both rendered from the same brand mark
// the old inline data-URI SVG favicon drew, just as a real file now
// instead of a data URI (which some crawlers/OS icon caches don't handle
// well, and which had no apple-touch-icon equivalent at all).
export const metadata: Metadata = {
  title: siteConfig.pageTitle,
  description: siteConfig.pageDescription,
  openGraph: {
    title: siteConfig.pageTitle,
    description: siteConfig.pageDescription,
    url: siteConfig.siteUrl,
    siteName: siteConfig.pageTitle,
    type: "website",
    images: [
      {
        url: `${siteConfig.siteUrl}/og-image.png`,
        width: 1440,
        height: 1024,
        alt: siteConfig.pageDescription,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.pageTitle,
    description: siteConfig.pageDescription,
    images: [`${siteConfig.siteUrl}/og-image.png`],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
