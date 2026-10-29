import type { Metadata } from "next";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-semi-condensed/500.css";
import "@fontsource/barlow-semi-condensed/600.css";
import "@fontsource/barlow-semi-condensed/700.css";
import "@fontsource-variable/roboto-mono";
import "./globals.css";
import { DbStatus } from "./components/db-status";
import { Header } from "./components/header";

export const metadata: Metadata = {
  title: "Blueprint for CPFB app builders",
  description: "Know what's yours on day 0, hand it to your agent, and your security review fills itself in.",
};

/** Every page is one drawing sheet: a double ruled frame, the title block across the top, grid paper below. */
export default function RootLayout({ children, titlecells }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto my-8 w-[min(1400px,calc(100vw-64px))] border border-ink bg-paper outline outline-1 outline-offset-4 outline-ink/40">
          <Header cells={titlecells} />
          <DbStatus />
          <main className="drafting-grid min-h-[calc(100vh-220px)] px-10 pt-10 pb-16">{children}</main>
        </div>
      </body>
    </html>
  );
}
