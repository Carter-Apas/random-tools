import { useEffect, useState, type ReactNode } from "react";

import { ThemeProvider, useTheme, type Theme } from "../theme";
import {
  isTheme,
  nextTheme,
  readThemePreference,
  saveThemePreference,
  systemTheme,
  themeIconPaths,
  themePreferenceKey,
  themes,
  themeToggleLabel,
} from "../appearance";

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreference] = useState<Theme | null>(readThemePreference);
  const [system, setSystem] = useState<Theme>(systemTheme);
  const theme = preference ?? system;

  const setTheme = (next: Theme) => {
    saveThemePreference(next);
    setPreference(next);
  };

  useEffect(() => {
    document.documentElement.dataset.monoTheme = theme;
  }, [theme]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === themePreferenceKey || event.key === null)
        setPreference(isTheme(event.newValue) ? event.newValue : null);
    };

    const query = matchMedia("(prefers-color-scheme: dark)");

    const syncSystem = () => setSystem(systemTheme());

    query.addEventListener("change", syncSystem);
    window.addEventListener("storage", sync);
    return () => {
      query.removeEventListener("change", syncSystem);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return (
    <ThemeProvider theme={theme} onThemeChange={setTheme} className="mono-app">
      {children}
    </ThemeProvider>
  );
};

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  return (
    <button
      className="mono-theme-toggle"
      type="button"
      data-theme={theme}
      aria-label={themeToggleLabel(theme)}
      title={themeToggleLabel(theme)}
      onClick={() => setTheme(nextTheme(theme))}
    >
      {themes.map((item) => (
        <svg key={item} data-theme-icon={item} viewBox="0 0 24 24" aria-hidden="true">
          {themeIconPaths[item].map((path) => (
            <path key={path} d={path} />
          ))}
        </svg>
      ))}
    </button>
  );
};

export const AppearancePicker = ThemeToggle;

export const AppHeader = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) => (
  <header className="mono-app-header">
    <a className="mono-app-brand" href="/">
      <span className="mono-app-mark" aria-hidden="true">
        C
      </span>
      <span>
        <strong>{title}</strong>
        {description && <small>{description}</small>}
      </span>
    </a>
    <div className="mono-app-actions">
      {children}
      <ThemeToggle />
    </div>
  </header>
);
