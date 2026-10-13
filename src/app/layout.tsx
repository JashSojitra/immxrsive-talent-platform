import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ProjectDisclaimer } from "@/components/brand/BrandLogo";

import "../../public/threeui/fonts.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NOT ImmXrsive Talent & Industry Platform",
    template: "%s | NOT ImmXrsive",
  },
  description: "Independent student-built course project for discovering talent across immersive technology, software, design, spatial computing, and AI.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <ProjectDisclaimer />
      </body>
    </html>
  );
}
