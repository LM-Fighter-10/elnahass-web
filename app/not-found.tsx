"use client";

import Link from "next/link";
import { useDisableSiteChrome } from "@/components/SiteChrome";
import "@/styles/404Page.css";

function NotFoundContent() {
  useDisableSiteChrome();

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css?family=Josefin+Sans:400,700"
        rel="stylesheet"
      />
      <div id="notfound">
        <div className="notfound">
          <div className="notfound-404">
            <h1>
              4<span>0</span>4
            </h1>
          </div>
          <p>
            The page you are looking for might have been removed had its name
            changed or is temporarily unavailable.
          </p>
          <Link href="/">home page</Link>
        </div>
      </div>
    </>
  );
}

export default function NotFound() {
  return <NotFoundContent />;
}
