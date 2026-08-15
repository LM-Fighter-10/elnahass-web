"use client";

import { useCallback, useMemo, useState } from "react";
import type { ProjectListItem } from "@/lib/types";
import HomeCarousel from "./HomeCarousel";
import OurWorkSection from "./OurWorkSection";
import ExpandJoinForm from "./ExpandJoinForm";
import HomeScrollReveal from "./HomeScrollReveal";

type HomeViewProps = {
  projects: ProjectListItem[];
};

export default function HomeView({ projects }: HomeViewProps) {
  const [expandOpen, setExpandOpen] = useState(false);

  const images = useMemo(
    () =>
      projects
        .map((p) => p.img)
        .filter((src) => src && !src.includes("NoImageSelected")),
    [projects],
  );

  const projectSelectors = useMemo(() => {
    const sels: string[] = [];
    for (const p of projects) {
      sels.push(`#p${p.id}-img`, `#p${p.id}-txt`);
    }
    return sels;
  }, [projects]);

  const onExpandAutoClose = useCallback(() => {
    setExpandOpen(false);
  }, []);

  return (
    <>
      <HomeCarousel images={images} />
      <OurWorkSection projects={projects} />
      <ExpandJoinForm open={expandOpen} onOpenChange={setExpandOpen} />
      <HomeScrollReveal
        projectSelectors={projectSelectors}
        expandOpen={expandOpen}
        onExpandAutoClose={onExpandAutoClose}
      />
    </>
  );
}
