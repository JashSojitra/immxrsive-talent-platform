import { expect, test } from "vitest";
import { padStoryVolumes, newsstandPapers, safeStoryMessage, storyPosts } from "@/updates/world-content";
import { emptyArticle } from "@/updates/policy";
test("the API's volume projection pads and caps at seven without inventing students",()=>{
  const v={name:"Synthetic Student",role:"Test role",photoUrl:null,excerpt:"Test excerpt",href:"/updates/test-story"};
  expect(padStoryVolumes([])).toHaveLength(7);expect(padStoryVolumes([]).every(x=>x.name==="Coming Soon" && x.href===null)).toBe(true);expect(padStoryVolumes([v])[0]).toEqual(v);expect(padStoryVolumes(Array(9).fill(v))).toHaveLength(7);
});
test("newsstand uses five event/news posts and stories never include either",()=>{
  const posts=Array.from({length:12},(_,i)=>({...emptyArticle,id:String(i),slug:`test-${i}`,title:`Test ${i}`,category:(i%3===0 ? "student_success":i%3===1 ? "event":"news") as "news"|"event"|"student_success",publishedAt:new Date("2026-11-26"),updatedAt:new Date()}));
  const papers=newsstandPapers(posts);expect(papers).toHaveLength(5);expect(papers[0].href).toBe("/updates/test-1");expect(papers[0].date).toBe("2026-11-26");expect(storyPosts(posts).every(p=>p.category==="student_success")).toBe(true);expect(newsstandPapers([])).toEqual([]);
});
test("shelf messages allow only same-origin article routes",()=>{
  const origin="https://example.test";const data={type:"immxrsive:open-story",href:"/updates/test-story"};expect(safeStoryMessage(origin,origin,data)).toBe(data.href);expect(safeStoryMessage("https://evil.test",origin,data)).toBeNull();
  for(const href of ["//evil.test","/updates/../admin","/updates/%2e%2e/admin","/updates/evil\\path","javascript:alert(1)","/admin"]) expect(safeStoryMessage(origin,origin,{...data,href})).toBeNull();
});
