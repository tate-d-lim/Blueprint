import type { Metadata } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/roboto-mono";
import "./globals.css";
import { DbStatus } from "./components/db-status";
import { Header } from "./components/header";

export const metadata: Metadata = {
  title: "Blueprint for CPFB app builders",
  description: "Know what's yours on day 0, hand it to your agent, and your security review fills itself in.",
};

/** Every page: the simple header, then the page on drafting white. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <Header />
        <DbStatus />
        <main className="mx-auto w-full max-w-[1440px] px-8 pt-8 pb-16">{children}</main>
      </body>
    </html>
  );
}
