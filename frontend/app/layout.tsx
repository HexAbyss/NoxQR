import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope, Outfit } from "next/font/google";

import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "NOX | Visual Encoding Engine",
  description:
    "NOX is a premium single-page demonstration for artistic QR generation with a Rust rendering engine and a clean open-source-ready frontend.",
  icons: {
    icon: "/nox-mark.svg",
    shortcut: "/nox-mark.svg",
    apple: "/nox-mark.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className={`${outfit.variable} ${manrope.variable}`}>{children}</body>
    </html>
  );
}