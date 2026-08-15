"use client";

import type { CSSProperties } from "react";
import type { ProjectListItem } from "@/lib/types";
import { EASE_OUT_EXPO, SCROLL_REVEAL_MS } from "@/lib/animations";

type OurWorkSectionProps = {
  projects: ProjectListItem[];
};

const revealHidden: CSSProperties = {
  opacity: 0,
  flexBasis: "100%",
  transform: "translateY(28px)",
  filter: "blur(4px)",
  transition: [
    `opacity ${SCROLL_REVEAL_MS}ms ${EASE_OUT_EXPO}`,
    `transform ${SCROLL_REVEAL_MS}ms ${EASE_OUT_EXPO}`,
    `filter ${SCROLL_REVEAL_MS}ms ${EASE_OUT_EXPO}`,
  ].join(", "),
};

const rowFlex: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
};

/**
 * Our Work rows — odd index gets `order-md-2` on img (Django counter % 2 !== 0).
 * Scroll reveal `.animated` is applied by HomeScrollReveal.
 */
export default function OurWorkSection({ projects }: OurWorkSectionProps) {
  return (
    <section id="projects" className="bg-white py-3">
      <div className="container projects-section">
        <div className="container" id="projects-div-title">
          <h1 id="projects-title" className="text-center">
            Our Work
          </h1>
        </div>

        {projects.map((item, index) => {
          const odd = index % 2 !== 0;
          const hasImg = Boolean(item.img);
          return (
            <div
              key={item.id}
              className="project row"
              id={`p${item.id}`}
              style={rowFlex}
            >
              {hasImg ? (
                <div
                  className={`col-md-6 projects-img${odd ? " order-md-2" : ""}`}
                  id={`p${item.id}-img`}
                  style={revealHidden}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    draggable={false}
                    src={item.img}
                    alt=""
                    className="project-img w-100"
                  />
                </div>
              ) : null}
              <div
                className={`col-md-6 projects-txt${odd ? " order-md-1" : ""}`}
                id={`p${item.id}-txt`}
                style={revealHidden}
              >
                <div className="row row-edited align-items-center">
                  <div className="project-txt col">
                    <h1 className="display-3 project-title">{item.name}</h1>
                    <p className="lead project-desc">
                      {item.desc}
                      <br />
                      <br />
                    </p>
                    <div id="p-details">
                      <button
                        type="button"
                        className="detailsbtn"
                        id={`showbtn${item.id}`}
                        onClick={() => {
                          window.open(`/project_view/${item.id}`, "_self");
                        }}
                      >
                        Show Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
