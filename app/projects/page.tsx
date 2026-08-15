import ProjectsView from "@/components/ProjectsView";
import "@/styles/projects.css";

/** Client fetches `/api/projects` so SSR stays light and PageLoader stays ~2s. */
export default function ProjectsPage() {
  return <ProjectsView />;
}
