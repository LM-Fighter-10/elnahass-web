"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { ProjectListItem } from "@/lib/types";
import { PROJECTS_PER_PAGE } from "@/lib/animations";

type FilterId = "construction" | "landscape" | "repair";
type SortMode = "newest" | "oldest" | null;

type ProjectsViewProps = {
  /** Optional SSR seed; otherwise client fetches `/api/projects`. */
  projects?: ProjectListItem[];
};

function projectImgSrc(img: string): string {
  if (!img || img.includes("NoImageSelected")) {
    // Real asset so PageLoader image wait completes; path keeps NoImageSelected for PR-03
    return "/NoImageSelected/placeholder.webp";
  }
  if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("/")) {
    return img;
  }
  return `/${img}`;
}

function sortProjects(
  list: ProjectListItem[],
  mode: SortMode,
): ProjectListItem[] {
  const next = list.slice();
  if (mode === "oldest") {
    next.sort((a, b) => a.year - b.year);
  } else if (mode === "newest") {
    next.sort((a, b) => b.year - a.year);
  }
  return next;
}

export default function ProjectsView({ projects: seed }: ProjectsViewProps) {
  const [projects, setProjects] = useState<ProjectListItem[]>(seed ?? []);
  const [ordered, setOrdered] = useState<ProjectListItem[]>(seed ?? []);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterId | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>(null);
  const [sortLabel, setSortLabel] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);
  const [sortUiVisible, setSortUiVisible] = useState(false);
  const [visibleIds, setVisibleIds] = useState<Set<number>>(() => new Set());
  const [animatedIds, setAnimatedIds] = useState<Set<number>>(() => new Set());
  /** Defer project <img> src until after PageLoader reveals .webPage (avoids hung wait). */
  const [imagesArmed, setImagesArmed] = useState(false);
  const timersRef = useRef<number[]>([]);
  const criteriaRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLLabelElement>(null);

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
  }, []);

  const scheduleZoom = useCallback(
    (
      list: ProjectListItem[],
      opts: {
        mode: "initial" | "restore" | "page" | "filter" | "reorder";
        pageNum?: number;
        filterId?: FilterId | null;
      },
    ) => {
      clearTimers();
      // Drop zoom-animate so cards ease out before the next page/filter set
      setAnimatedIds(new Set());

      const pageNum = opts.pageNum ?? 1;
      const nextVisible = new Set<number>();
      const delays: Array<{ id: number; delay: number }> = [];

      if (opts.mode === "filter" && opts.filterId) {
        let factor = 80;
        for (const p of list) {
          if (p.type.toLowerCase().includes(opts.filterId)) {
            nextVisible.add(p.id);
            delays.push({ id: p.id, delay: 100 + factor });
            factor += 60;
          }
        }
      } else if (opts.mode === "reorder") {
        let factor = 150;
        list.forEach((p, idx) => {
          const x = idx + 1;
          if (x <= PROJECTS_PER_PAGE) {
            nextVisible.add(p.id);
            delays.push({ id: p.id, delay: 100 + factor });
            factor += 80;
          }
        });
      } else if (opts.mode === "initial") {
        let factor = 80;
        list.forEach((p, idx) => {
          const x = idx + 1;
          if (x <= PROJECTS_PER_PAGE) {
            nextVisible.add(p.id);
            delays.push({ id: p.id, delay: 100 + factor });
            factor += 60;
          }
        });
      } else if (opts.mode === "page" && pageNum > 1) {
        let factor = 80;
        list.forEach((p, idx) => {
          const x = idx + 1;
          if (x > PROJECTS_PER_PAGE * (pageNum - 1) && x <= pageNum * PROJECTS_PER_PAGE) {
            nextVisible.add(p.id);
            delays.push({ id: p.id, delay: 100 + factor });
            factor += 50;
          }
        });
      } else {
        // restore / page 1
        let factor = 80;
        list.forEach((p, idx) => {
          const x = idx + 1;
          if (x <= PROJECTS_PER_PAGE) {
            nextVisible.add(p.id);
            delays.push({ id: p.id, delay: 100 + factor });
            factor += 50;
          }
        });
      }

      // Intentional page/filter handoff: brief exit, then stagger enter (delays unchanged)
      const exitMs = opts.mode === "initial" ? 0 : 180;

      const applyEnter = () => {
        setVisibleIds(nextVisible);
        for (const { id, delay } of delays) {
          const t = window.setTimeout(() => {
            setAnimatedIds((prev) => {
              const n = new Set(prev);
              n.add(id);
              return n;
            });
          }, delay);
          timersRef.current.push(t);
        }
      };

      if (exitMs > 0) {
        const exitTimer = window.setTimeout(applyEnter, exitMs);
        timersRef.current.push(exitTimer);
      } else {
        applyEnter();
      }
    },
    [clearTimers],
  );

  // Fetch list from API when not seeded via props
  useEffect(() => {
    if (seed && seed.length > 0) return;
    let cancelled = false;
    void fetch("/api/projects")
      .then((r) => r.json())
      .then((data: ProjectListItem[]) => {
        if (cancelled || !Array.isArray(data)) return;
        setProjects(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [seed]);

  // Arm images + initial stagger once .webPage is shown and projects exist
  useEffect(() => {
    if (projects.length === 0) return;

    let cancelled = false;
    let started = false;

    const start = () => {
      if (cancelled || started) return;
      started = true;
      setImagesArmed(true);
      setOrdered(projects);
      setPage(1);
      setFilter(null);
      setSortMode(null);
      setSortLabel("");
      scheduleZoom(projects, { mode: "initial" });
    };

    const webPage = document.querySelector(".webPage") as HTMLElement | null;
    if (webPage && getComputedStyle(webPage).display !== "none") {
      start();
      return () => {
        cancelled = true;
        clearTimers();
      };
    }

    if (webPage) {
      const obs = new MutationObserver(() => {
        if (getComputedStyle(webPage).display !== "none") {
          obs.disconnect();
          start();
        }
      });
      obs.observe(webPage, { attributes: true, attributeFilter: ["style", "class"] });
      const fallback = window.setTimeout(start, 2600);
      timersRef.current.push(fallback);
      return () => {
        cancelled = true;
        obs.disconnect();
        clearTimers();
      };
    }

    const fallback = window.setTimeout(start, 100);
    timersRef.current.push(fallback);
    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [projects, scheduleZoom, clearTimers]);

  // Outside click: clear filter + close sort popup
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;

      if (popupRef.current && !popupRef.current.contains(target)) {
        setPopupOpen(false);
      }

      if (criteriaRef.current && !criteriaRef.current.contains(target)) {
        setFilter((prev) => {
          if (prev == null) return prev;
          const base = sortProjects(projects, sortMode);
          scheduleZoom(base, { mode: "restore" });
          setOrdered(base);
          setPage(1);
          return null;
        });
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [projects, sortMode, scheduleZoom]);

  const radioCount =
    filter != null
      ? 0
      : ordered.length >= PROJECTS_PER_PAGE
        ? Math.ceil(ordered.length / PROJECTS_PER_PAGE)
        : ordered.length > 0
          ? 1
          : 0;

  const onCriteriaClick = (id: FilterId) => {
    // Django toggles the clicked class but always runs updateData for that criteria
    setFilter(id);
    const base = sortProjects(projects, sortMode);
    setOrdered(base);
    setPage(1);
    scheduleZoom(base, { mode: "filter", filterId: id });
  };

  const onRadioClick = (i: number) => {
    setPage(i);
    if (i === 1) {
      scheduleZoom(ordered, { mode: "restore" });
    } else {
      scheduleZoom(ordered, { mode: "page", pageNum: i });
    }
  };

  const applySort = (label: string) => {
    const mode = label.toLowerCase() as SortMode;
    setSortMode(mode);
    setSortLabel(label);
    setSortUiVisible(true);
    const sorted = sortProjects(projects, mode);
    setOrdered(sorted);
    setPage(1);
    if (filter) {
      scheduleZoom(sorted, { mode: "filter", filterId: filter });
    } else {
      scheduleZoom(sorted, { mode: "reorder" });
    }
  };

  const clearSort = () => {
    setSortUiVisible(false);
    window.setTimeout(() => {
      setSortLabel("");
      setSortMode(null);
    }, 200);
    setOrdered(projects);
    setPage(1);
    if (filter) {
      scheduleZoom(projects, { mode: "filter", filterId: filter });
    } else {
      scheduleZoom(projects, { mode: "reorder" });
    }
  };

  const onCardClick = (id: number) => {
    window.open(`/project_view/${id}`, "_self");
  };

  const onPopupMouseUp = (e: ReactMouseEvent) => {
    e.preventDefault();
    setPopupOpen((o) => !o);
  };

  return (
    <>
      <div className="image-cover2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          draggable={false}
          className="projects-cover"
          id="projects_cover"
          src={imagesArmed ? "/Media/projects_cover.webp" : undefined}
          alt=""
        />
      </div>
      <div className="container projects-title-container">
        <h3 className="projects-title">Projects Page</h3>
      </div>
      <div className="projects-main">
        <div className="criteria-notch-container">
          <div className="container criteria-container" ref={criteriaRef}>
            {(
              [
                ["construction", "Construction Work"],
                ["landscape", "Landscape Work"],
                ["repair", "Repair Work"],
              ] as const
            ).map(([id, title]) => (
              <div
                key={id}
                className={`criteria-card${filter === id ? " criteria-card-clicked" : ""}`}
                id={id}
                onMouseUp={() => onCriteriaClick(id)}
              >
                <p className="criteria-title">{title}</p>
              </div>
            ))}
          </div>
          <div className="sort-dropdown">
            <span className="sortby">
              Sort By:
              <span
                id="criteria-selected"
                style={{ opacity: sortUiVisible ? 1 : 0 }}
              >
                {sortLabel ? ` ${sortLabel}` : ""}
              </span>
              <span
                className={`removeSort${sortUiVisible ? "" : " is-collapsed"}`}
                style={{ opacity: sortUiVisible ? 1 : 0 }}
                onClick={clearSort}
                role="button"
              >
                ❌
              </span>
            </span>
            <label
              className="popup"
              ref={popupRef}
              onMouseUp={onPopupMouseUp}
            >
              <input type="checkbox" checked={popupOpen} readOnly />
              <div className="burger" tabIndex={0}>
                <svg
                  height="1.2em"
                  className="arrow"
                  viewBox="0 0 512 512"
                  style={{ rotate: popupOpen ? "180deg" : "0deg" }}
                >
                  <path
                    d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5
                            12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.
                            5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z"
                  />
                </svg>
              </div>
              <nav className={`popup-window${popupOpen ? " maximise" : ""}`}>
                <legend>Sort By</legend>
                <ul>
                  <li
                    className="sortby-li"
                    onMouseUp={(e) => {
                      e.stopPropagation();
                      applySort("Newest");
                    }}
                  >
                    <button type="button">
                      <span className="sort-criteria">Newest</span>
                    </button>
                  </li>
                  <li
                    className="sortby-li"
                    onMouseUp={(e) => {
                      e.stopPropagation();
                      applySort("Oldest");
                    }}
                  >
                    <button type="button">
                      <span className="sort-criteria">Oldest</span>
                    </button>
                  </li>
                </ul>
              </nav>
            </label>
          </div>
        </div>

        <div className="container p_container">
          <div className="project-container">
            {ordered.map((project) => {
              const shown = visibleIds.has(project.id);
              const zoomed = animatedIds.has(project.id);
              return (
                <div
                  key={project.id}
                  id={`zoomAnim${project.id}`}
                  className={`zoomAnim${zoomed ? " zoom-animate" : ""}`}
                  style={{ display: shown ? "block" : "none" }}
                  data-year={project.year}
                  data-type={project.type}
                  data-id={project.id}
                >
                  <div
                    id={`p${project.id}`}
                    className="cta"
                    data-year={project.year}
                    data-type={project.type}
                    onClick={() => onCardClick(project.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      draggable={false}
                      id={`p_img${project.id}`}
                      className="p_img"
                      src={imagesArmed ? projectImgSrc(project.img) : undefined}
                      alt=""
                    />
                    <div className="p_body">
                      <h2 className="p_title">{project.name}</h2>
                      <p className="p_desc">{project.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div
          id="radio-notch"
          className="radio-button-container"
          style={{ display: filter != null ? "none" : undefined }}
        >
          {Array.from({ length: radioCount }, (_, idx) => {
            const i = idx + 1;
            return (
              <div key={i} className={`radio-button radio${i}`}>
                <input
                  type="radio"
                  className="radio-button__input"
                  id={`radio${i}`}
                  name="radio-group"
                  checked={page === i}
                  onChange={() => onRadioClick(i)}
                  onClick={() => onRadioClick(i)}
                />
                <label className="radio-button__label" htmlFor={`radio${i}`}>
                  <span className="radio-button__custom" />
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
