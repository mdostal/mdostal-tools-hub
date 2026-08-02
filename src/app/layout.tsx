import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%23050505'/%3E%3Ctext x='50' y='68' font-family='monospace' font-size='58' font-weight='700' fill='%23ff6b00' text-anchor='middle'%3Et%3C/text%3E%3C/svg%3E";

export const metadata: Metadata = {
  title: "Tools — mdostal.com",
  description: "Open-source tools, built and shipped in public. Live at tools.mdostal.com.",
  icons: { icon: FAVICON },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
