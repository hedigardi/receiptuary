import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { NetworkModeToggle } from "@/components/network-mode-toggle";
import { Providers } from "@/components/providers";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://receiptuary.com";
const siteName = "Receiptuary";
const siteDescription =
  "Verify digital receipts with local SHA-256 hashing and blockchain anchoring on Base.";

// Display/body/mono font variables are exposed to CSS custom properties in globals.css.
const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const bodyFont = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

// Metadata centralizes SEO/social cards for all routes under App Router.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} | On-Chain Receipt Verification`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    "receipt verification",
    "blockchain receipts",
    "on-chain proof",
    "sha-256",
    "base network",
    "document authenticity",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName,
    title: `${siteName} | On-Chain Receipt Verification`,
    description: siteDescription,
    images: [
      {
        url: "/logo.png",
        alt: "Receiptuary logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | On-Chain Receipt Verification`,
    description: siteDescription,
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NetworkModeToggle />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
