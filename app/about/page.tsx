import type { Metadata } from "next";
import "@/styles/about.css";
import AboutCounters from "@/components/AboutCounters";
import { fetchSiteSettings } from "@/lib/mongo";
import { DEFAULT_ABOUT } from "@/lib/siteDefaults";
import {
  CLIENTS_TARGET,
  PROJECTS_TARGET,
} from "@/lib/animations";

export const metadata: Metadata = {
  title: "About | Elnahass For Construction and Technology",
};

export const dynamic = "force-dynamic";

async function loadAboutCopy() {
  try {
    const settings = await fetchSiteSettings();
    const about = settings?.about;
    return {
      pageTitle: about?.pageTitle ?? DEFAULT_ABOUT.pageTitle,
      section1Title: about?.section1Title ?? DEFAULT_ABOUT.section1Title,
      section1Body: about?.section1Body ?? DEFAULT_ABOUT.section1Body,
      section2Title: about?.section2Title ?? DEFAULT_ABOUT.section2Title,
      section2Subtitle:
        about?.section2Subtitle ?? DEFAULT_ABOUT.section2Subtitle,
      section2Body: about?.section2Body ?? DEFAULT_ABOUT.section2Body,
      clientsTarget:
        about?.clientsTarget ??
        settings?.clientsTarget ??
        CLIENTS_TARGET,
      projectsTarget:
        about?.projectsTarget ??
        settings?.projectsTarget ??
        PROJECTS_TARGET,
    };
  } catch {
    return {
      ...DEFAULT_ABOUT,
      clientsTarget: CLIENTS_TARGET,
      projectsTarget: PROJECTS_TARGET,
    };
  }
}

export default async function AboutPage() {
  const copy = await loadAboutCopy();

  return (
    <>
      <div className="flex-column d-flex justify-content-center align-items-center">
        <img
          draggable={false}
          className="about-img"
          src="/Media/about_cover.webp"
          alt=""
        />
        <div className="container about-title-container">
          <h3 className="about-title">{copy.pageTitle}</h3>
        </div>
      </div>
      <section className="work-section work-section1">
        <div className="work-section-div">
          <h2 className="work-title" id="section1-title">
            {copy.section1Title}
          </h2>
          <p className="work-body" id="section1-body">
            {copy.section1Body}
          </p>
          <div>
            <AboutCounters
              clientsTarget={copy.clientsTarget}
              projectsTarget={copy.projectsTarget}
            />
          </div>
        </div>
      </section>
      <section className="work-section">
        <div className="work-section-div">
          <h2 className="work-title work-title2" id="section2-title">
            {copy.section2Title}
          </h2>
          <h3 className="work-subtitle" id="section2-subtitle">
            {copy.section2Subtitle}
          </h3>
          <p className="work-body work-body2" id="section2-body">
            {copy.section2Body}
          </p>
        </div>
      </section>
    </>
  );
}
