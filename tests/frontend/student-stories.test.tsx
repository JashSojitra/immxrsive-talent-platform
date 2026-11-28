// @vitest-environment jsdom
import "./setup";
import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { StudentStories, type HomeStory } from "@/components/home/StudentStories";
import { UpdatesHighlights } from "@/components/home/UpdatesHighlights";
import { PeopleHeading } from "@/components/home/PeopleRail";
import { emptyArticle } from "@/updates/policy";
const post = (category: HomeStory["category"], index = 0): HomeStory => ({ ...emptyArticle, id: `${category}-${index}`, title: `${category} ${index}`, slug: `${category.replace("_", "-")}-${index}`, category, excerpt: "Test-only excerpt", publishedAt: new Date("2026-11-26"), updatedAt: new Date(), student: { name: "Synthetic Student", avatarMediaId: "00000000-0000-4000-8000-000000000001" } });
test("student stories exclude events/news, cap at six and link to articles", () => {
  render(<StudentStories stories={[post("event"), post("news"), ...Array.from({length:8},(_,i)=>post("student_success",i))]} />);
  const list=screen.getByRole("list",{name:"Student stories"});expect(within(list).getAllByRole("article")).toHaveLength(6);expect(list).not.toHaveTextContent("event 0");expect(list).not.toHaveTextContent("news 0");expect(within(list).getAllByRole("img",{name:"Synthetic Student"})).toHaveLength(6);for(const link of within(list).getAllByRole("link")) expect(link.getAttribute("href")).toMatch(/^\/updates\//);
});
test("no stories shows one honest empty state",()=>{render(<StudentStories />);expect(screen.getAllByRole("heading",{name:"Stories coming soon"})).toHaveLength(1);expect(screen.queryByRole("img")).toBeNull();});
test("updates reuse rail plates and exclude student stories; People has no cards",()=>{
  render(<><UpdatesHighlights posts={[post("student_success"),...Array.from({length:7},(_,i)=>post(i%2 ? "event":"news",i))]} /><PeopleHeading /></>);const list=screen.getByRole("list",{name:"Latest updates"});expect(within(list).getAllByRole("listitem")).toHaveLength(4);expect(list).not.toHaveTextContent("student_success");expect(screen.getByRole("link",{name:/Meet the talent/})).toHaveAttribute("href","/talent");expect(screen.queryByText("Synthetic Student")).toBeNull();
});
