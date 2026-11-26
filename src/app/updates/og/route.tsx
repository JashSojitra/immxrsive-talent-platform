import { ImageResponse } from "next/og";
export async function GET() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 90, color: "#fff0f6", background: "linear-gradient(120deg, #2a0f2b, #582c83)", fontFamily: "sans-serif" }}><div style={{ fontSize: 32, color: "#ff8dc4" }}>ImmXrsive · Algoma University</div><div style={{ fontSize: 94, marginTop: 35 }}>Updates &amp; Stories</div><div style={{ fontSize: 28, marginTop: 30 }}>People. Projects. Possibilities.</div></div>, { width: 1200, height: 630 });
}
