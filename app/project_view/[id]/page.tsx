import { notFound } from "next/navigation";
import type { ProjectDetail } from "@/lib/types";
import { fetchProjectDetail } from "@/lib/mongo";
import { splitProjectDescription } from "@/lib/splitProjectDescription";
import ProjectSwiper from "@/components/ProjectSwiper";
import "@/styles/project_view.css";
import "@/styles/Slider.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

const NO_IMAGE = "NoImageSelected/";

function mediaSrc(url: string): string {
  if (!url) return url;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return url.startsWith("/") ? url : `/${url}`;
}

function isRealCover(cover: string | undefined): boolean {
  if (!cover) return false;
  return cover !== NO_IMAGE && !cover.endsWith(NO_IMAGE);
}

/**
 * Project detail — Agent V.
 * Data shape matches GET /api/projects/[projectId] (gallery already reordered).
 */
export default async function ProjectViewPage({ params }: PageProps) {
  const { id: raw } = await params;
  const projectId = Number(raw);
  if (!Number.isFinite(projectId) || projectId <= 0) {
    notFound();
  }

  // Same source as GET /api/projects/[projectId] (reorder applied in fetchProjectDetail)
  const project: ProjectDetail | null = await fetchProjectDetail(projectId);
  if (!project) {
    notFound();
  }

  const textLines = splitProjectDescription(project.description ?? "");

  return (
    <main>
      <div className="image-cover">
        {isRealCover(project.cover) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            draggable={false}
            className="project-cover"
            src={mediaSrc(project.cover)}
            alt=""
          />
        ) : null}
        <div className="overlay" />
        <div className="container pView-title-container">
          <h3 className="pView-title">{project.name}</h3>
        </div>
      </div>

      <div className="main-img">
        <div className="container p-container">
          <div className="p-arabic-container">
            <h3 className="p-title">:تفاصيل المشروع</h3>
            <div className="p-detail-line line-edited" />
          </div>
          <div className="p-desc">
            {textLines.map((line, i) => (
              <p key={i} className="text-lines">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="p-detail-wrapper">
          <div className="p-details-container">
            <div className="p-detail-col">
              <div className="p-detail-item">
                <div className="p-detail-line" />
                <div className="p-detail-title">Year</div>
                <div className="p-detail-description">{project.year}</div>
              </div>
            </div>
            <div className="p-detail-col">
              <div className="p-detail-item">
                <div className="p-detail-line" />
                <div className="p-detail-title">Location</div>
                <div className="p-detail-description">{project.location}</div>
              </div>
            </div>
            <div className="p-detail-col">
              <div className="p-detail-item">
                <div className="p-detail-line" />
                <div className="p-detail-title">Client</div>
                <div className="p-detail-description">{project.clientName}</div>
              </div>
            </div>
            <div className="p-detail-col">
              <div className="p-detail-item">
                <div className="p-detail-line" />
                <div className="p-detail-title">Sector</div>
                <div className="p-detail-description">{project.type}</div>
              </div>
            </div>
          </div>
        </div>

        <ProjectSwiper images={project.gallery ?? []} />
      </div>
    </main>
  );
}
