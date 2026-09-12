import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Sans, IBM_Plex_Sans_Devanagari } from "next/font/google";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { THEME_COOKIE, THEME_INIT_SCRIPT, isThemePreference } from "@/lib/theme";
import { ServiceWorkerRegistration } from "@/components/service-worker";
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
  const themeCookie = (await cookies()).get(THEME_COOKIE)?.value;
  // Explicit light/dark is rendered by the server; "system" is resolved
  // by THEME_INIT_SCRIPT before first paint.
  const theme = isThemePreference(themeCookie) ? themeCookie : "system";

  return (
    <html
      lang={locale}
      className={`${plexSans.variable} ${plexSansDevanagari.variable}${theme === "dark" ? " dark" : ""}`}
      data-theme-preference={theme}
      // The init script may add "dark" before hydration.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
