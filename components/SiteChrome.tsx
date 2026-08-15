"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { isAdminUiPath } from "@/lib/admin-path";
import PageLoader from "./PageLoader";
import Navbar from "./Navbar";
import JoinUsForm from "./JoinUsForm";
import Footer from "./Footer";

type SiteChromeProps = {
  children: ReactNode;
  /** When false, omit nav/join/footer/loader (e.g. 404). Default true. */
  withChrome?: boolean;
};

const DisableChromeContext = createContext<((disabled: boolean) => void) | null>(
  null,
);

/** Call from standalone pages (404) so root layout SiteChrome hides nav/loader. */
export function useDisableSiteChrome(): void {
  const setDisabled = useContext(DisableChromeContext);
  useLayoutEffect(() => {
    if (!setDisabled) return;
    setDisabled(true);
    return () => setDisabled(false);
  }, [setDisabled]);
}

export default function SiteChrome({
  children,
  withChrome = true,
}: SiteChromeProps) {
  const pathname = usePathname();
  const isAdminRoute = Boolean(pathname && isAdminUiPath(pathname));
  const [menuOpen, setMenuOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [forceDisable, setForceDisable] = useState(false);

  const setDisabled = useCallback((disabled: boolean) => {
    setForceDisable(disabled);
  }, []);

  // Admin CMS must not inherit public PageLoader / nav / footer.
  const chromeOn = withChrome && !forceDisable && !isAdminRoute;

  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);

  useLayoutEffect(() => {
    if (!chromeOn) {
      document.body.style.overflow = "";
      document.body.style.backgroundColor = "";
    }
  }, [chromeOn]);

  const onToggleMenu = useCallback(() => {
    setMenuOpen((o) => !o);
  }, []);

  const onCloseMenu = useCallback(() => setMenuOpen(false), []);

  // Match Django #join-btn: toggle — close if already open, else open
  const onJoinClick = useCallback(() => {
    setJoinOpen((open) => !open);
  }, []);

  return (
    <DisableChromeContext.Provider value={setDisabled}>
      {chromeOn ? (
        <PageLoader>
          <Navbar
            menuOpen={menuOpen}
            onToggleMenu={onToggleMenu}
            onCloseMenu={onCloseMenu}
            onJoinClick={onJoinClick}
          />
          <JoinUsForm open={joinOpen} onOpenChange={setJoinOpen} />
          {children}
          <Footer />
        </PageLoader>
      ) : (
        children
      )}
    </DisableChromeContext.Provider>
  );
}
