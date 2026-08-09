import type { Metadata, Viewport } from "next";
import { EVENT } from "@/config/event";
import "./globals.css";

export const metadata: Metadata = {
  title: EVENT.name,
  description: EVENT.tagline,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: EVENT.name,
    // Makes the status bar blend into the dark background once installed to
    // the Home Screen, instead of sitting in a white strip.
    statusBarStyle: "black-translucent",
  },
  // Stops iOS turning "1:00 PM" and any digits into blue phone links.
  formatDetection: { telephone: false, date: false, address: false },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#08070c",
  // viewportFit: cover is what makes env(safe-area-inset-*) return real
  // numbers. Without it the insets are all 0 and content hides under the
  // Dynamic Island and the home indicator.
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  // Deliberately allows zoom: locking it out breaks accessibility, and the
  // 16px input rule already prevents the unwanted auto-zoom on focus.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="grain antialiased">{children}</body>
    </html>
  );
}
