import type { Metadata } from "next";
import { ThreeAmApp } from "@/threeam/ThreeAmApp";

export const metadata: Metadata = {
  title: "3am — Rohan Yadav",
  description: "it's 3am inside Rohan's head. mind the mess.",
};

export default function ThreeAmPage() {
  return <ThreeAmApp />;
}
