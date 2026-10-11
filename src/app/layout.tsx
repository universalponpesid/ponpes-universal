import "./globals.css";

import type { Metadata } from "next";

import { storeConfig } from "@/config/store";
import { CartProvider } from "@/components/cart";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  metadataBase: new URL(storeConfig.siteUrl),
  title: {
    default: storeConfig.name,
    template: `%s | ${storeConfig.name}`,
  },
  description: storeConfig.description,
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: storeConfig.name,
    title: storeConfig.name,
    description: storeConfig.description,
    locale: storeConfig.locale.replace("-", "_"),
  },
  twitter: {
    card: "summary_large_image",
    title: storeConfig.name,
    description: storeConfig.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={storeConfig.locale.split("-")[0]}>
      <body><CartProvider tenantId={storeConfig.tenantId}><Navbar /><div className="min-h-[calc(100vh-72px)]">{children}</div><Footer /></CartProvider></body>
    </html>
  );
}
