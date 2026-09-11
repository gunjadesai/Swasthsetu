import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// IBM Plex Sans: chosen partly because its Devanagari + other Indic
// companion cuts exist under the same family name, which matters once
// Phase 6 (multilingual UI) starts - the headline and the Hindi label
// next to it can stay visually related instead of clashing.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
});

export const metadata: Metadata = {
  title: "Rural Health Platform",
  description:
    "Accessibility and quality of public healthcare services in rural and underserved areas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={plexSans.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
