/**
 * Central selectors map — preserve Django class/id names for parity tests.
 */
export const selectors = {
  spinner: ".spinner",
  webPage: ".webPage",
  navbar: "#navbar",
  burgerBtn: "#burgerBtn",
  menuIconSpans: ".menu__icon span",
  joinBtn: "#join-btn",
  joinButtonLi: "#join-button-li",
  contactForm: "#contact-form",
  contactBody: "#contact-bdy",
  joinSubmit: "#joinBTN",
  joinExpandCta: "#joinBTN2",
  joinExpandSubmit: "#joinBTN3",
  expandForm: ".expand-form",
  footer: "#footer-sec",
  projectsTitle: "#projects-title",
  projectsCover: ".projects_cover, #projects_cover, img[src*='projects_cover']",
  zoomAnim: ".zoomAnim",
  projectCard: ".cta",
  projectCover: ".project-cover",
  textLines: ".text-lines",
  swiperNext: ".swiper-button-next",
  swiperPrev: ".swiper-button-prev",
  clientsNum: "#clientsNum",
  projectsNum: "#projectsNum",
  section1Title: "#section1-title",
  contactTitle: ".contact-title",
  googleMap: "#googleMap",
  filterConstruction: "#construction",
  nameField: ".name",
  emailField: ".email",
  phoneField: ".phone",
  descField: ".desc",
} as const;

export type SelectorKey = keyof typeof selectors;
