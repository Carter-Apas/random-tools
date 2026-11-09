export const number = (value: number | null | undefined, digits = 1): string =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-NZ", { maximumFractionDigits: digits }).format(value)
    : "—";

export const hourLabel = (local: string): string => {
  const hour = Number(local.slice(11, 13));
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return `${hour % 12}${hour < 12 ? "am" : "pm"}`;
};

export const shortTime = (local: string | null): string => {
  if (!local) return "—";
  return `${hourLabel(local).replace(/(am|pm)$/, "")}:${local.slice(14, 16)}${Number(local.slice(11, 13)) < 12 ? "am" : "pm"}`;
};

export const escape = (value: string | number | null | undefined): string =>
  String(value ?? "—").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ??
      character,
  );

export const weatherLabel = (code: number | null): string => {
  if (code === null) return "Weather unavailable";
  const categories: [number, string][] = [
    [0, "Clear skies"],
    [2, "Partly cloudy"],
    [3, "Overcast"],
    [48, "Foggy"],
    [57, "Drizzle"],
    [67, "Rain"],
    [77, "Snow"],
    [82, "Showers"],
    [86, "Snow showers"],
    [99, "Thunderstorms"],
  ];
  return categories.find(([max]) => code <= max)?.[1] ?? "Weather unavailable";
};

export const directionArrow = (degrees: number | null): string => {
  if (degrees === null) return "";
  return `<svg class="direction-arrow" viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(${degrees}deg)"><path d="M12 3v17m-5-6 5 6 5-6"/></svg>`;
};

export const element = <T extends HTMLElement>(id: string): T => {
  const result = document.getElementById(id);
  if (!result) throw new Error(`Missing element: ${id}`);
  return result as T;
};
