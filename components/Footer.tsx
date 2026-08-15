"use client";

import { useEffect } from "react";
import { EASE_OUT_BACK, EASE_OUT_CUBIC } from "@/lib/motion";

const ICON_IDS = [
  "phone-ico",
  "mail-ico",
  "loc-ico",
  "what-ico",
  "fa-ico",
] as const;

const HOVER_BG = "rgb(235, 126, 57)";
const IDLE_BG = "#33383b";
const ICON_TRANSITION = [
  `color 320ms ${EASE_OUT_CUBIC}`,
  `background-color 320ms ${EASE_OUT_CUBIC}`,
  `transform 360ms ${EASE_OUT_BACK}`,
  `line-height 320ms ${EASE_OUT_CUBIC}`,
].join(", ");

export default function Footer() {
  const year = new Date().getFullYear();

  useEffect(() => {
    const els = ICON_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => !!el,
    );

    els.forEach((el) => {
      el.style.color = "rgb(255,255,255)";
      el.style.backgroundColor = IDLE_BG;
      el.style.transition = ICON_TRANSITION;
      el.style.cursor = "pointer";
    });

    const onEnter = (e: Event) => {
      const el = e.currentTarget as HTMLElement;
      el.style.color = "black";
      el.style.backgroundColor = HOVER_BG;
      if (el.id === "mail-ico" || el.id === "phone-ico") {
        el.style.transform = "rotate(20deg)";
      }
      if (el.id === "loc-ico") {
        el.style.lineHeight = "35px";
      }
    };

    const onLeave = (e: Event) => {
      const el = e.currentTarget as HTMLElement;
      el.style.color = "white";
      el.style.backgroundColor = IDLE_BG;
      if (el.id === "mail-ico" || el.id === "phone-ico") {
        el.style.transform = "rotate(0)";
      }
      if (el.id === "loc-ico") {
        el.style.lineHeight = "42px";
      }
    };

    els.forEach((el) => {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    });

    return () => {
      els.forEach((el) => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
      });
    };
  }, []);

  return (
    <footer id="footer-sec" className="footer-distributed">
      <div className="container footer-container">
        <div className="footer-center">
          <div className="location">
            <a
              href="https://goo.gl/maps/gmeL1TZerMb9RJ8e6"
              target="_blank"
              rel="noreferrer"
            >
              <i id="loc-ico" className="fa-solid fa-location-dot footer-icon" />
            </a>
            <p>
              <span>18 Omaraat Emdaad wy Tamween</span> Makram-Ebid Ext, Nasr
              City, Cairo, Egypt
            </p>
          </div>
          <div className="telephone">
            <a href="tel:+201000026223" target="_blank" rel="noreferrer">
              <i
                id="phone-ico"
                className="fa-solid fa-phone fa-2xs footer-icon"
              />
            </a>
            <p>+201000026223</p>
          </div>
          <div className="mail">
            <a
              href="mailto:info@elnahass-sonsgroup.com"
              target="_blank"
              rel="noreferrer"
            >
              <i
                id="mail-ico"
                style={{ fontSize: 20 }}
                className="fa fa-envelope footer-icon"
              />
            </a>
            <p>info@elnahass-sonsgroup.com</p>
          </div>
        </div>
        <div className="footer-right">
          <p className="footer-company-about">
            <span style={{ fontSize: 16 }}>About the company</span>
          </p>
          <div id="footer-about">
            Elnahass For Construction and Technology: A top player in
            Construction, Mechanical &amp; Computer Projects. Committed to
            excellence, innovation, and client satisfaction.
          </div>
          <div className="footer-icons">
            <div className="container">
              <a href="#">
                <i id="fa-ico" className="fab fa-facebook-f footer-icon" />
              </a>
              <a
                href="https://wa.me/+201000026223"
                target="_blank"
                rel="noreferrer"
                style={{ marginLeft: 20 }}
              >
                <i
                  id="what-ico"
                  style={{ display: "inline-table", fontSize: 30 }}
                  className="fa-brands fa-whatsapp fa-lg footer-icon"
                />
              </a>
            </div>
          </div>
        </div>
        <div className="all-rights">
          <p id="copyRights">
            All rights reserved © Omar Alaa Elnahass {year}
          </p>
        </div>
      </div>
    </footer>
  );
}
