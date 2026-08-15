"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";

type NavbarProps = {
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onJoinClick: () => void;
};

export default function Navbar({
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onJoinClick,
}: NavbarProps) {
  const handleDocClick = useCallback(
    (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!menuOpen) return;
      // Match deployed base.html: ignore burger + carousel indicator clicks
      if (target?.closest(".background, #nav-slider")) return;
      onCloseMenu();
    },
    [menuOpen, onCloseMenu],
  );

  useEffect(() => {
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, [handleDocClick]);

  const spanClass = (anim: string) => (menuOpen ? anim : "");

  return (
    <nav
      id="navbar"
      className="navbar navbar-expand-lg navbar-dark fixed-top bg-transparent"
      style={{ position: "absolute" }}
    >
      <div id="nav" className="container">
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            draggable={false}
            className="nav-logo-img"
            src="/Media/logo.png"
            width={80}
            alt="Elnahass For Construction and Technology"
          />
        </Link>
        <div className="background">
          <button
            id="burgerBtn"
            type="button"
            className="navbar-toggler menu__icon"
            aria-controls="navbarNav"
            aria-expanded={menuOpen}
            aria-label="Toggle navigation"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu();
            }}
          >
            <span className={spanClass("firstSpan-animation")} />
            <span className={spanClass("secondSpan-animation")} />
            <span className={spanClass("thirdSpan-animation")} />
          </button>
        </div>
        <div
          className={`collapse navbar-collapse${menuOpen ? " in" : ""}`}
          id="navbarNav"
        >
          <div id="nav-tabs" className="container">
            <ul
              className="navbar-nav ml-auto mr-auto"
              id="nav-list"
              style={{ fontSize: "larger" }}
            >
              <li className="nav-item">
                <Link
                  draggable={false}
                  id="navbtn"
                  className="nav-link"
                  href="/projects/"
                >
                  Projects
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  draggable={false}
                  id="navbtn"
                  className="nav-link"
                  href="/about/"
                >
                  About
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  draggable={false}
                  id="navbtn"
                  className="nav-link"
                  href="/contact/"
                >
                  Contact
                </Link>
              </li>
              <li className="nav-item" id="join-button-li">
                <a
                  draggable={false}
                  id="join-btn"
                  className="nav-link"
                  role="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onJoinClick();
                  }}
                >
                  Join Us
                  <i
                    id="arrow"
                    className="fa-solid fa-arrow-right fa-sm arrow-icon"
                  />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}
