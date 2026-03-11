import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Libre_Baskerville,
  Cinzel,
  JetBrains_Mono,
} from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-label",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Council",
  description: "Multi-Agent AI Advisory Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${libreBaskerville.variable} ${cinzel.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-body bg-council-navy text-council-text-primary">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
