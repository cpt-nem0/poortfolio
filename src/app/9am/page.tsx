import type { Metadata } from "next";
import { BentoGrid } from "@/components/bento/BentoGrid";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Rohan Yadav — Engineer",
  description: site.bio,
  openGraph: {
    title: "Rohan Yadav — Engineer",
    description: site.bio,
    images: [
      {
        url: "/og/9am.png",
        width: 1200,
        height: 630,
        alt: "Rohan Yadav's portfolio",
      },
    ],
    type: "website",
    siteName: "3am.quest",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rohan Yadav — Engineer",
    description: site.bio,
    images: ["/og/9am.png"],
  },
};

export default function NineAmPage() {
  return <BentoGrid />;
}
