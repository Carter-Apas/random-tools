export const themes = ["light", "mirage", "dark"] as const;

export type Theme = (typeof themes)[number];

export const themePreferenceKey = "mono.appearance";

export const isTheme = (value: unknown): value is Theme => themes.includes(value as Theme);

export const readThemePreference = (): Theme | null => {
  try {
    const saved = localStorage.getItem(themePreferenceKey);
    return isTheme(saved) ? saved : null;
  } catch {
    return null;
  }
};

export const systemTheme = (): Theme =>
  matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export const saveThemePreference = (theme: Theme) => {
  try {
    localStorage.setItem(themePreferenceKey, theme);
  } catch (error) {
    console.warn("Theme preference could not be saved; it applies to this visit only:", error);
  }
};

export const nextTheme = (theme: Theme): Theme =>
  themes[(themes.indexOf(theme) + 1) % themes.length];

export const themeLabel = (theme: Theme) => theme[0].toUpperCase() + theme.slice(1);

export const themeToggleLabel = (theme: Theme) =>
  `${themeLabel(theme)} theme. Switch to ${themeLabel(nextTheme(theme))}.`;

export const themeIconPaths: Record<Theme, string[]> = {
  light: [
    "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
    "M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42m0-14.14-1.42 1.42m-11.3 11.3-1.42 1.42",
  ],
  mirage: [
    "M3 15h18M5 19h14M7 15a5 5 0 0 1 10 0",
    "M12 3v3M4.22 7.22l2.12 2.12m13.44-2.12-2.12 2.12",
  ],
  dark: ["M20.5 13.3A8.5 8.5 0 0 1 10.7 3.5a8.5 8.5 0 1 0 9.8 9.8Z"],
};
