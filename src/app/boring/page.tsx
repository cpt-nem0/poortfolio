import type { Metadata } from "next";
import { BentoGrid } from "@/components/bento/BentoGrid";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Rohan Yadav — Engineer",
  description: site.bio,
};

export default function BoringPage() {
  return <BentoGrid />;
}
