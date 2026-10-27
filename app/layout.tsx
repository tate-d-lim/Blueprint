import type { Metadata } from "next";
import "./globals.css";
import { DbStatus } from "./components/db-status";
import { Header } from "./components/header";

export const metadata: Metadata = {
  title: "Build plan for CPFB app builders",
  description: "Know what's yours on day 0, hand it to your agent, and your security review fills itself in.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          <DbStatus />
          {children}
        </main>
      </body>
    </html>
  );
}
