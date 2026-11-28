import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const css = readFileSync("src/styles/tokens.css", "utf8");
const color = (name: string) => css.match(new RegExp(`--${name}: #(\\w{6});`))![1];
function luminance(hex: string) {
  const rgb = [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}

test("small text and button colors meet WCAG AA against the site surfaces", () => {
  for (const foreground of ["bone", "muted", "flare", "ion"]) {
    for (const background of ["void", "ink", "surface", "surface-raised"]) {
      expect(contrast(color(foreground), color(background)), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
    }
  }
  for (const background of ["brand-plum", "brand-cold-purple"]) {
    expect(contrast("ffffff", color(background))).toBeGreaterThanOrEqual(4.5);
  }
  expect(contrast(color("ink"), color("flare"))).toBeGreaterThanOrEqual(4.5);
});
