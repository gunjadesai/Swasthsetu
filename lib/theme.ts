// Light / dark / system theme preference, shared by the root layout
// (server, reads the cookie so explicit light/dark render without a
// flash) and the ThemeToggle (client, writes it). "system" follows the
// device setting via prefers-color-scheme.
export const THEME_COOKIE = "NEXT_THEME";

export const themePreferences = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof themePreferences)[number];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (themePreferences as readonly string[]).includes(value);
}

// Runs before first paint (inlined in <head>) for the "system" case, so
// a phone in dark mode never flashes a white page on load.
export const THEME_INIT_SCRIPT = `(function(){try{var r=document.documentElement;var p=r.dataset.themePreference||"system";if(p==="system"){r.classList.toggle("dark",window.matchMedia("(prefers-color-scheme: dark)").matches);}}catch(e){}})();`;
