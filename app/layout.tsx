import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Devanagari } from "next/font/google";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { LocaleProvider } from "@/lib/i18n/locale-context";
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

// Latin and Devanagari are separate font files even within the same
// family, so both are loaded; globals.css switches which one applies
// per :lang() rather than per-component.
const plexSansDevanagari = IBM_Plex_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans-devanagari",
});

export const metadata: Metadata = {
  title: "Swasthsetu",
  description:
    "Accessibility and quality of public healthcare services in rural and underserved areas.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${plexSans.variable} ${plexSansDevanagari.variable}`}
    >
      <body className="font-sans antialiased">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
