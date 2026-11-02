import Link from "next/link";
import { ProjectWorkspace } from "@/components/project-editor/ProjectWorkspace";
export default function NotFound() { return <ProjectWorkspace title="Project unavailable." intro="This private project is not available to your account."><Link href="/student/projects">Return to My Projects</Link></ProjectWorkspace>; }
