import type { Metadata } from "next";
import { ThreeAmApp } from "@/threeam/ThreeAmApp";

export const metadata: Metadata = {
  title: "it's 3am in here",
  description:
    "a walkable pixel house. the record player works. the cat is asleep. mind the mess.",
  openGraph: {
    title: "it's 3am in here",
    description:
      "a walkable pixel house. the record player works. the cat is asleep. mind the mess.",
    images: [
      {
        url: "/og/house.png",
        width: 1200,
        height: 630,
        alt: "a pixel-art house at 3am, lamps glowing",
      },
    ],
    type: "website",
    siteName: "3am.quest",
  },
  twitter: {
    card: "summary_large_image",
    title: "it's 3am in here",
    description:
      "a walkable pixel house. the record player works. the cat is asleep. mind the mess.",
    images: ["/og/house.png"],
  },
};

export default function Home() {
  return <ThreeAmApp />;
}
