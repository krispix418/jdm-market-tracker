import type { Metadata } from "next";
import { Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial display serif for mastheads & headlines (variable weight).
// Swap fonts by changing only this import + call; the CSS var name stays stable.
const serifDisplay = Fraunces({
  variable: "--font-serif-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The JDM Ledger",
  description: "Auction values and price trends for JDM and sport cars — a market ledger for collectors and buyers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} ${serifDisplay.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
