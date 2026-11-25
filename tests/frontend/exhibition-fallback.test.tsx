// @vitest-environment jsdom
import "./setup";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { ReactNode } from "react";
vi.mock("swiper/react", () => ({ Swiper: ({ children }: { children: ReactNode }) => <div>{children}</div>, SwiperSlide: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
import { Carousel_001 } from "@/components/v1/skiper47";
import { AdminDiscovery } from "@/admin/Discovery";

test("a failed project image restores its metadata composition and project link", () => {
  const { container } = render(<Carousel_001 images={[{ src: "https://example.test/missing.jpg", alt: "Test-only project image", title: "Test-only project", href: "/projects/test-only", domain: "Spatial computing", description: "Test-only fallback verification", technologies: ["WebXR"] }]} />);
  fireEvent.error(screen.getByAltText("Test-only project image"));
  expect(container.querySelector('[data-media-fallback="true"]')).toBeTruthy();
  expect(screen.getByText("WebXR")).toBeVisible();
  expect(screen.getByRole("link")).toHaveAttribute("href", "/projects/test-only");
});

test("an empty staff showcase has a compact explanation and recovery without a nonfunctional search", () => {
  render(<AdminDiscovery rows={[]} />);
  expect(screen.getByRole("heading", { name: "The next experience is taking shape." })).toBeVisible();
  expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Explore published projects/ })).toHaveAttribute("href", "/projects");
});
