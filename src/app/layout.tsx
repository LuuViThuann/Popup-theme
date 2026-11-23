import type { Metadata, Viewport } from "next";
import {
  Cinzel_Decorative,
  Geist_Mono,
  Great_Vibes,
  Manrope,
} from "next/font/google";
import "./globals.css";

/** Engraved serif for the wordmark. */
const cinzel = Cinzel_Decorative({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
});

/** Copperplate script for the "Merry" flourish. */
const greatVibes = Great_Vibes({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

/** UI face - carries Vietnamese diacritics cleanly at small sizes. */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

/** Tabular numerals for the countdown. */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Merry Christmas · Đêm diệu kỳ",
  description:
    "Thiệp Giáng sinh tương tác: tuyết rơi, ông già Noel và món quà đang chờ bạn mở.",
};

export const viewport: Viewport = {
  themeColor: "#04060d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${cinzel.variable} ${greatVibes.variable} ${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/*
        Browser extensions decorate <body> before React hydrates - ColorZilla
        adds `cz-shortcut-listen`, Grammarly adds its own - and React reports
        the extra attributes as a hydration mismatch. Suppressing here covers
        this element's own attributes only; children still hydrate normally,
        so a real mismatch inside the app is still reported.
      */}
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
