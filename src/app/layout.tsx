import type { Metadata } from "next";
import { Inter, Bungee } from "next/font/google";
import Script from "next/script";
import "./globals.css";
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

// metadataBase is intentionally UNSET: Next resolves relative OG/Twitter image
// URLs from VERCEL_PROJECT_PRODUCTION_URL, which tracks whatever the current
// production domain is (the vercel.app name today, 3am.quest once attached) —
// no code change needed when the real domain lands.
export const metadata: Metadata = {
  title: {
    template: "%s",
    default: "3am.quest",
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
