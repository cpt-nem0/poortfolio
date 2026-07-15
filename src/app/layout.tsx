import type { Metadata } from "next";
import { Inter, Bungee } from "next/font/google";
import "./globals.css";
import { site } from "@/content/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const bungee = Bungee({
  variable: "--font-bungee",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${site.name} — ${site.role}`,
  description: site.bio,
  metadataBase: new URL("https://cpt-nem0.github.io"),
  openGraph: {
    title: site.name,
    description: site.bio,
    url: "https://cpt-nem0.github.io",
    type: "website",
  },
  icons: { icon: "/logo.jpg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${bungee.variable}`}>
      <body className="min-h-screen antialiased">
        <div className="underlay" aria-hidden />
        {children}
      </body>
    </html>
  );
}
