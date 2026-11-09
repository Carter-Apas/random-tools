import { createContext, useContext, useState, type ReactNode } from "react";

import type { Theme } from "./appearance";
import { systemTheme } from "./appearance";

export { themes, type Theme } from "./appearance";
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void }>({
  theme: "mirage",
  setTheme: () => {},
});

export const ThemeProvider = ({
  theme: controlledTheme,
  defaultTheme,
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
  const [localTheme, setLocalTheme] = useState<Theme>(() => defaultTheme ?? systemTheme());
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
