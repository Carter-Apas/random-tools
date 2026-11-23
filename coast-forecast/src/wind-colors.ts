export const sliceColor = (direction: number, light: boolean): string =>
  `hsl(${(direction + 205) % 360} 65% ${light ? 35 : 70}%)`;

export const lightTheme = (): boolean => document.documentElement.dataset.monoTheme === "light";
