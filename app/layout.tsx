import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { LiveToast } from "@/components/ui/live-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Volejbal Tatry",
    template: "%s | Volejbal Tatry"
  },
  description: "Klubový priestor pre volejbalové zápasy, tréningy, štatistiky a hráčske profily v regióne Tatier."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="sk">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
        <LiveToast />
      </body>
    </html>
  );
}
