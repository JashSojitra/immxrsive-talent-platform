/**
 * Generates the static "scan to join" QR code used by /world.
 * Run with: npx tsx scripts/generate-world-qr.ts [url]
 * The SVG is committed, so qrcode stays a dev-only dependency.
 */
import { writeFileSync } from "node:fs";
import QRCode from "qrcode";

const url = process.argv[2] ?? "https://immxrsive-talent-platform.vercel.app/";
const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0a0c12", light: "#f4f0e8" } });
writeFileSync(new URL("../public/world/join-qr.svg", import.meta.url), svg);
console.log(`Wrote public/world/join-qr.svg for ${url}`);
