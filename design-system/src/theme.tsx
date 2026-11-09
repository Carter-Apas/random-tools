import { createContext, useContext, useState, type ReactNode } from "react";

export const themes = ["dark", "mirage", "light"] as const;
export type Theme = (typeof themes)[number];
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void }>({
  theme: "mirage",
  setTheme: () => {},
});

/** Themes are scoped: multiple providers can preview different appearances together. */
export const ThemeProvider = ({
  theme: controlledTheme,
  defaultTheme = "mirage",
  onThemeChange,
  children,
  className = "",
}: {
  theme?: Theme;
  defaultTheme?: Theme;
  onThemeChange?: (theme: Theme) => void;
  children: ReactNode;
  className?: string;
}) => {
  const [localTheme, setLocalTheme] = useState<Theme>(defaultTheme);
  const theme = controlledTheme ?? localTheme;
  const setTheme = (next: Theme) => {
    setLocalTheme(next);
    onThemeChange?.(next);
  };
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={`mono ${className}`} data-mono-theme={theme}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};
export const useTheme = () => useContext(ThemeContext);
