/** @vitest-environment jsdom */

import "./setup";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InquiryForm } from "@/components/inquiry/InquiryForm";
import { InquiryPage } from "@/components/inquiry/InquiryPage";
import { InquiryRouteError, InquiryUnavailable } from "@/components/inquiry/InquiryRouteState";

const studentSource = {
  type: "student" as const,
  id: "S01",
  name: "Avery Chen",
  detail: "XR Developer focused on training simulations",
  sourceUrl: "/students/S01",
};

describe("contextual inquiry experience", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders student context and a locked four-field employer form", () => {
    render(<InquiryPage source={studentSource} />);
    expect(screen.getByRole("heading", { level: 1, name: "Avery Chen" })).toBeInTheDocument();
    expect(screen.getByText(studentSource.detail)).toBeInTheDocument();
    expect(screen.getByRole("form", { name: /employer inquiry about avery chen/i })).toBeInTheDocument();
    expect(screen.getAllByLabelText(/required/i)).toHaveLength(4);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("S01")).not.toBeInTheDocument();
  });

  it("renders project context without selecting a contributor", () => {
    render(<InquiryPage source={{
      type: "project", id: "P01", name: "Industrial Safety VR Trainer",
      detail: "Immersive safety training prototype for industrial onboarding.",
      sourceUrl: "/projects/P01",
    }} />);
    expect(screen.getByText("Inquiry about")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Industrial Safety VR Trainer" })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("Avery Chen");
  });

  it("shows accessible field errors and retains employer values", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      error: {
        code: "VALIDATION_ERROR",
        message: "Review the highlighted inquiry fields.",
        details: [{ field: "contactEmail", code: "INVALID_FORMAT", message: "Enter a valid contact email." }],
      },
    }), { status: 422, headers: { "Content-Type": "application/json" } }));
    const user = userEvent.setup();
    render(<InquiryForm source={{ type: "student", id: "S01", name: "Avery Chen" }} />);
    await user.type(screen.getByLabelText(/company name/i), "Example Inc.");
    await user.type(screen.getByLabelText(/contact name/i), "Alex Employer");
    await user.type(screen.getByLabelText(/contact email/i), "invalid");
    await user.type(screen.getByLabelText(/inquiry description/i), "A meaningful inquiry description for Avery.");
    await user.click(screen.getByRole("button", { name: /submit inquiry/i }));

    expect(await screen.findByText("Error: Enter a valid contact email.")).toBeInTheDocument();
    expect(screen.getByLabelText(/contact email/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/company name/i)).toHaveValue("Example Inc.");
    expect(screen.getByLabelText(/inquiry description/i)).toHaveValue("A meaningful inquiry description for Avery.");
  });

  it("prevents duplicate submission while the request is pending", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => undefined));
    render(<InquiryForm source={{ type: "student", id: "S01", name: "Avery Chen" }} />);
    const form = screen.getByRole("form");
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(fetch).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled();
  });

  it("renders and focuses a successful confirmation", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      id: "46aa3f31-cc0a-4f84-b20a-8c6a3ca3ef31",
      message: "Inquiry submitted successfully.",
    }), { status: 201, headers: { "Content-Type": "application/json" } }));
    const user = userEvent.setup();
    render(<InquiryForm source={{ type: "student", id: "S01", name: "Avery Chen" }} />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /submit inquiry/i }));
    const success = await screen.findByRole("status");
    expect(success).toHaveTextContent(/inquiry received/i);
    await waitFor(() => expect(success).toHaveFocus());
  });

  it("shows backend failure separately and preserves values for retry", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      error: { code: "INTERNAL_ERROR", message: "The inquiry could not be submitted right now.", details: [] },
    }), { status: 500, headers: { "Content-Type": "application/json" } }));
    const user = userEvent.setup();
    render(<InquiryForm source={{ type: "project", id: "P01", name: "Industrial Safety VR Trainer" }} />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /submit inquiry/i }));
    expect(await screen.findByText("Submission interrupted")).toBeInTheDocument();
    expect(screen.getByText(/entered information is still here/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company name/i)).toHaveValue("Example Inc.");
    expect(screen.getByRole("button", { name: /submit inquiry/i })).toBeEnabled();
  });
});

describe("inquiry route states", () => {
  it("renders a useful non-disclosing unavailable state", () => {
    render(<InquiryUnavailable />);
    expect(screen.getByRole("heading", { name: /inquiry source.*not available/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return to talent index/i })).toHaveAttribute("href", "/talent");
  });

  it("renders a recoverable route failure", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<InquiryRouteError reset={reset} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });
});

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/company name/i), "Example Inc.");
  await user.type(screen.getByLabelText(/contact name/i), "Alex Employer");
  await user.type(screen.getByLabelText(/contact email/i), "alex@example.com");
  await user.type(screen.getByLabelText(/inquiry description/i), "We would like to discuss an internship opportunity.");
}
