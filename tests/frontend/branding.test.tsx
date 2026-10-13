// @vitest-environment jsdom

import "./setup";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { BrandLogo, ProjectDisclaimer } from "@/components/brand/BrandLogo";

describe("NOT ImmXrsive branding", () => {
  test("uses the exact supplied logo path with accessible fallback text", () => {
    render(<BrandLogo />);
    const image = screen.getByAltText("NOT ImmXrsive");
    expect(image).toHaveAttribute("src", expect.stringContaining("not-immxrsive-logo.png"));
    expect(screen.getByRole("link", { name: /NOT ImmXrsive talent directory home/i }))
      .toHaveAttribute("href", "/talent");
    fireEvent.error(image);
    expect(image).toHaveAttribute("alt", "NOT ImmXrsive");
  });

  test("identifies the site as an independent student project", () => {
    render(<ProjectDisclaimer />);
    expect(screen.getByLabelText("Project status")).toHaveTextContent(
      "Not an official ImmXrsive or Algoma University service",
    );
  });
});
