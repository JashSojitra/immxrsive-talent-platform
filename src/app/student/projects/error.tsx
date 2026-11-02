"use client";
import Link from "next/link";
import { ProjectWorkspace } from "@/components/project-editor/ProjectWorkspace";
export default function ErrorState({ reset }: { reset: () => void }) { return <ProjectWorkspace title="A pause in the studio." intro="The project workspace could not load. Your saved work remains available."><div role="alert"><button type="button" onClick={reset}>Try again</button><p><Link href="/student/dashboard">Return to dashboard</Link></p></div></ProjectWorkspace>; }
