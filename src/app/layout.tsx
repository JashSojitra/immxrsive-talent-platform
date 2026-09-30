import type { Metadata } from "next";
import type { ReactNode } from "react";

import "../../public/threeui/fonts.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ImmXrsive Talent & Industry Platform",
    template: "%s | ImmXrsive",
  },
  description: "Student and alumni talent across immersive technology, software, design, spatial computing, and AI.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
