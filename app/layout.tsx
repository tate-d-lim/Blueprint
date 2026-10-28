import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/roboto-mono";
import "./globals.css";
import { DbStatus } from "./components/db-status";
import { Header } from "./components/header";

export const metadata: Metadata = {
  title: "Build plan for CPFB app builders",
  description: "Know what's yours on day 0, hand it to your agent, and your security review fills itself in.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <Header />
        <DbStatus />
        <main className="sgds:mx-auto sgds:w-full sgds:max-w-container-xl sgds:flex-1 sgds:px-layout-md sgds:py-layout-md">
          {children}
        </main>
      </body>
    </html>
  );
}
