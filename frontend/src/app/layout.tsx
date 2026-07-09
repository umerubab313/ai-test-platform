import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { Logo } from "@/components/ui/Logo";
import { MswProvider } from "@/components/layout/MswProvider";
import { NavStepIndicator } from "@/components/layout/NavStepIndicator";
import { PageTransition } from "@/components/layout/PageTransition";
import { SonnerToaster } from "@/components/sonner-toaster";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "AI Test Platform",
  description: "AI-powered API test automation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} min-h-screen overflow-x-hidden bg-graphite font-body text-[#F5F5F5] antialiased`}
      >
        <header className="sticky top-0 z-50 border-b border-indigo-electric/20 bg-graphite/95 backdrop-blur-sm">
          <nav className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
            <Logo className="shrink-0" />
            <NavStepIndicator />
          </nav>
        </header>

        <main className="mx-auto min-w-0 max-w-7xl overflow-x-hidden px-4 py-6 sm:px-6">
          <MswProvider>
            <PageTransition>{children}</PageTransition>
          </MswProvider>
        </main>

        <SonnerToaster />
      </body>
    </html>
  );
}
