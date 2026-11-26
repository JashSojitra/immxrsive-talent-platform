// @vitest-environment jsdom
import "./setup";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ArticleEditor } from "@/updates/Editor";
import { ArticleCard } from "@/updates/Cards";
import { emptyArticle } from "@/updates/policy";
vi.mock("next/navigation",()=>({useRouter:()=>({replace:vi.fn(),refresh:vi.fn()})}));
test("editor generates an editable slug, previews copy, and limits event fields",()=>{
  render(<ArticleEditor />); fireEvent.change(screen.getByLabelText("Title"),{target:{value:"A real event"}}); expect(screen.getByLabelText("Slug")).toHaveValue("a-real-event"); expect(screen.getByRole("heading",{name:"A real event"})).toBeVisible(); expect(screen.queryByLabelText("Event date")).toBeNull();
  fireEvent.change(screen.getByLabelText("Category"),{target:{value:"event"}}); expect(screen.getByLabelText("Event date")).toBeVisible(); fireEvent.change(screen.getByLabelText("Slug"),{target:{value:"custom"}}); fireEvent.change(screen.getByLabelText("Title"),{target:{value:"Changed title"}}); expect(screen.getByLabelText("Slug")).toHaveValue("custom");
  fireEvent.change(screen.getByLabelText("Category"),{target:{value:"student_success"}}); expect(screen.getByRole("button",{name:"Request student approval"})).toBeVisible(); expect(screen.queryByLabelText("Event date")).toBeNull();
});
test("cards link to the article and show category and excerpt",()=>{
  render(<ArticleCard article={{...emptyArticle,id:"test",title:"Test event",slug:"test-event",category:"event",excerpt:"An honest excerpt",publishedAt:new Date("2026-11-26"),updatedAt:new Date()}} />);
  expect(screen.getByRole("link",{name:"Test event"})).toHaveAttribute("href","/updates/test-event"); expect(screen.getByText("Events")).toBeVisible(); expect(screen.getByText("An honest excerpt")).toBeVisible();
});
