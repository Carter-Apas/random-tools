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
  type Theme,
} from "./appearance";

export const initMono = () => {
  document.body.classList.add("mono");
  let preference = readThemePreference();
  let current: Theme = preference ?? systemTheme();

  const applyAppearance = () => {
    current = preference ?? systemTheme();
    document.documentElement.dataset.monoTheme = current;
    document.querySelectorAll<HTMLButtonElement>(".mono-theme-toggle").forEach((button) => {
      button.dataset.theme = current;
      button.setAttribute("aria-label", themeToggleLabel(current));
      button.title = themeToggleLabel(current);
    });
    window.dispatchEvent(new CustomEvent("mono-theme-change", { detail: current }));
  };

  const header = document.querySelector<HTMLElement>("[data-mono-app-header]");
  if (header) {
    header.classList.add("mono-app-header");
    const brand = document.createElement("a");
    brand.className = "mono-app-brand";
    brand.href = "/";
    const mark = document.createElement("span");
    mark.className = "mono-app-mark";
    mark.textContent = "C";
    mark.setAttribute("aria-hidden", "true");
    const text = document.createElement("strong");
    text.textContent = header.dataset.title ?? document.title;
    brand.append(mark, text);
    const actions = document.createElement("div");
    actions.className = "mono-app-actions";
    actions.append(...header.childNodes);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mono-theme-toggle";
    for (const theme of themes) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.dataset.themeIcon = theme;
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");
      for (const value of themeIconPaths[theme]) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", value);
        svg.append(path);
      }
      button.append(svg);
    }
    button.addEventListener("click", () => {
      preference = nextTheme(current);
      saveThemePreference(preference);
      applyAppearance();
    });
    actions.append(button);
    header.replaceChildren(brand, actions);
  }
  applyAppearance();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!preference) applyAppearance();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === themePreferenceKey || event.key === null) {
      preference = isTheme(event.newValue) ? event.newValue : null;
      applyAppearance();
    }
  });
  document.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "checkbox") return;
    const row = input.closest<HTMLElement>(".mono-checkbox[data-mono-animated]");
    if (!row) return;
    delete row.dataset.celebrating;
    if (!input.checked || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    row.getBoundingClientRect();
    row.dataset.celebrating = "true";
  });
  document.addEventListener("animationend", (event) => {
    if (event.animationName === "mono-check-glow" && event.target instanceof HTMLElement)
      delete event.target.dataset.celebrating;
  });
};
