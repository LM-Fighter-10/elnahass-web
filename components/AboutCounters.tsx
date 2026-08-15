"use client";

import { useEffect, useState } from "react";
import {
  CLIENTS_TARGET,
  COUNTER_TICK_MS,
  PROJECTS_TARGET,
} from "@/lib/animations";
import { useScrollReveal } from "@/lib/useScrollReveal";

type AboutCountersProps = {
  clientsTarget?: number;
  projectsTarget?: number;
};

function useCountUp(target: number): string {
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    setDisplay("0");
    const id = window.setInterval(() => {
      setDisplay((prev) => {
        if (prev.includes("+")) {
          window.clearInterval(id);
          return prev;
        }
        const n = parseInt(prev, 10);
        if (Number.isNaN(n) || n >= target) {
          window.clearInterval(id);
          return `${target}+`;
        }
        const next = n + 1;
        return next === target ? `${next}+` : String(next);
      });
    }, COUNTER_TICK_MS);
    return () => window.clearInterval(id);
  }, [target]);

  return display;
}

const REVEAL_SEL =
  "#section1-title, #section1-body, #counter, #section2-title, #section2-subtitle, #section2-body";

export default function AboutCounters({
  clientsTarget = CLIENTS_TARGET,
  projectsTarget = PROJECTS_TARGET,
}: AboutCountersProps) {
  useScrollReveal(REVEAL_SEL);
  const clients = useCountUp(clientsTarget);
  const projects = useCountUp(projectsTarget);

  return (
    <div className="u-layout" id="counter">
      <div className="work-data-layout-row">
        <div className="work-data-layout-row-div">
          <div className="work-data-layout-row-container">
            <h1 className="work-data-layout-row-container-num" id="clientsNum">
              {clients}
            </h1>
            <p className="work-data-layout-row-container-lable">clients</p>
          </div>
        </div>
        <div className="work-data-layout-row-div">
          <div className="work-data-layout-row-container">
            <h1
              className="work-data-layout-row-container-num"
              id="projectsNum"
            >
              {projects}
            </h1>
            <p className="work-data-layout-row-container-lable">Projects Done</p>
          </div>
        </div>
      </div>
    </div>
  );
}
