import type { Metadata } from "next";
import { Inter, Bungee } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { site } from "@/content/site";
import { themeInitScript } from "@/components/bento/theme";
import { GoatCounterPageviews } from "@/components/GoatCounterPageviews";

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
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="night" className={`${inter.variable} ${bungee.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <GoatCounterPageviews />
        <Script
          data-goatcounter="https://cpt-n3m0.goatcounter.com/count"
          src="https://gc.zgo.at/count.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
