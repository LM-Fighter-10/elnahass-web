import type { Metadata } from "next";
import "./globals.css";
import "../styles/home.css";
import "../styles/motion.css";
import SiteChrome from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "Elnahass For Construction and Technology",
  description:
    "Elnahass For Construction and Technology — construction and landscape",
  icons: {
    icon: "/Media/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap@3.3.5/dist/css/bootstrap.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
        />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Hammersmith+One&family=Open+Sans:wght@400;600;700&family=Play&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          position: "relative",
          backgroundColor: "black",
          overflow: "hidden",
        }}
        // Match Django oncontextmenu="return false"
        suppressHydrationWarning
      >
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
