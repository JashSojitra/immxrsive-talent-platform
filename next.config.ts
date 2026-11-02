import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const application = [
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), xr-spatial-tracking=()" },
    ];
    return [
      ...["/projects/:path*", "/students/:path*", "/student/:path*", "/api/:path*", "/talent"].map(source => ({ source, headers: application })),
      { source: "/fixtures/r3/:path*", headers: [
        { key: "Content-Security-Policy", value: "default-src 'none'; script-src 'sha256-GF6VgUgnDup4061I2zIcOH9SjC3Q0Lc0+e/rbWFwA2g='; style-src 'sha256-q2PDlbSsnFa4xp1uzpfOpE8q2Z61v5Vyi2mk/eN3cnE='; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'; sandbox allow-scripts" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), xr-spatial-tracking=()" },
      ] },
    ];
  },
  serverExternalPackages: ["pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/v1/student/profile/resume/extract": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
};

export default nextConfig;
