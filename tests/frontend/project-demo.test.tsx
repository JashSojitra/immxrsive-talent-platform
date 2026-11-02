// @vitest-environment jsdom
import "./setup";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ProjectDemo } from "@/components/project-detail/ProjectDemo";
const assets = [
  { type: "playable", label: "Prototype", url: "/fixtures/r3/working_demo.html" },
  { type: "video", label: "Walkthrough", url: "https://example.com/demo.mp4" },
  { type: "source", label: "Code", url: "https://github.com/example/prototype" },
  { type: "fallback_image", label: "Alternate", url: "/fixtures/r3/fallback.svg", altText: "A diagram of the prototype" },
];
afterEach(() => vi.useRealTimers());
describe("visitor-initiated isolated project experience", () => {
  test("unreviewed providers offer external access without executing a frame", () => {
    const { container } = render(<ProjectDemo title="Project" assets={[{type:"playable",label:"External demo",url:"https://example.com/experience"}]} />);
    fireEvent.click(screen.getByRole("button", { name: /Play Demo/ })); expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("external launch"); expect(screen.getByRole("link", { name:/Open Externally/ })).toHaveAttribute("href","https://example.com/experience");
  });
  test("no interactive frame or video loads until requested, with separate evidence actions", () => {
    const { container } = render(<ProjectDemo title="Project" assets={assets} />);
    expect(container.querySelector("iframe")).toBeNull(); expect(container.querySelector("video")).toBeNull();
    expect(screen.getByRole("button", { name: "Watch Demo" })).toBeVisible();
    expect(screen.getByRole("link", { name: /View Source/ })).toHaveAttribute("href", assets[2].url);
    expect(screen.getByAltText("A diagram of the prototype")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Play Demo/ }));
    expect(screen.getByTitle("Project playable demo")).toHaveAttribute("sandbox", "allow-scripts");
    expect(screen.getByTitle("Project playable demo")).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(screen.getByTitle("Project playable demo")).not.toHaveAttribute("srcdoc");
  });
  test("slow loading remains uncertain and retry/stop cleanly replace and remove the frame", () => {
    vi.useFakeTimers(); render(<ProjectDemo title="Project" assets={assets} />);
    fireEvent.click(screen.getByRole("button", { name: /Play Demo/ })); const first = screen.getByTitle("Project playable demo");
    act(() => vi.advanceTimersByTime(10_001)); expect(screen.getByRole("status")).toHaveTextContent("may be slow");
    fireEvent.click(screen.getByRole("button", { name: "Retry demo" })); expect(screen.getByTitle("Project playable demo")).not.toBe(first);
    fireEvent.click(screen.getByRole("button", { name: "Stop / Close demo" })); expect(screen.queryByTitle("Project playable demo")).not.toBeInTheDocument();
    expect(screen.getByAltText("A diagram of the prototype")).toBeVisible();
    act(() => vi.runOnlyPendingTimers()); expect(screen.getByRole("status")).toHaveTextContent("Demo stopped");
  });
  test("a frame load event never claims a working demo, and external launch remains available", () => {
    vi.useFakeTimers(); render(<ProjectDemo title="Project" assets={assets} />); fireEvent.click(screen.getByRole("button", { name: /Play Demo/ }));
    fireEvent.load(screen.getByTitle("Project playable demo")); act(() => vi.advanceTimersByTime(10_001));
    expect(screen.getByRole("status")).toHaveTextContent("does not confirm the demo works");
    expect(screen.getByRole("link", { name: /Open Externally/ })).toHaveAttribute("rel", "noopener noreferrer");
  });
  test("missing fallback media and unplayable video retain descriptions, links and other evidence", () => {
    const { container } = render(<ProjectDemo title="Project" assets={assets} />);
    fireEvent.error(screen.getByAltText("A diagram of the prototype")); expect(screen.getByText(/fallback media could not/)).toBeVisible();
    expect(screen.getByRole("link", { name: /Open fallback evidence/ })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Watch Demo" })); expect(container.querySelector("video")).toHaveAttribute("preload", "none");
    fireEvent.error(container.querySelector("video")!); expect(screen.getByText(/video could not be played/)).toBeVisible();
  });
  test.each(["video", "source", "fallback_image", "fallback_video", "fallback_link"])("supports independent %s evidence without a playable frame", type => {
    const url = type === "fallback_image" ? "/fixtures/r3/fallback.svg" : "https://example.com/evidence";
    const { container } = render(<ProjectDemo title="Project" assets={[{type,url,label:"Evidence"}]} />);
    expect(screen.queryByRole("button", { name: /Play Demo/ })).not.toBeInTheDocument(); expect(container.querySelector("iframe")).toBeNull();
  });
  test("unsafe legacy media cannot become links or embedded content", () => {
    const { container } = render(<ProjectDemo title="Project" assets={[{type:"playable",url:"javascript:alert(1)",label:"Unsafe"},{type:"fallback_image",url:"http://127.0.0.1/a",label:"Unsafe"}]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
