import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ProjectDisclaimer } from "@/components/brand/BrandLogo";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

import "../../public/threeui/fonts.css";
import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
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
        <SiteHeader />
        <div id="site-content" className="site-content" tabIndex={-1}>{children}</div>
        <SiteFooter />
        <ProjectDisclaimer />
      </body>
    </html>
  );
}
