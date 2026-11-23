import { wrapBearing } from "../shared/orientation";
import type { WindSurface } from "../shared/types";

export const windDial = (surface: WindSurface, direction: number, offshore: number): string => {
  const marker = (bearing: number, radius: number) => {
    const angle = (bearing * Math.PI) / 180;
    return { x: 80 + Math.sin(angle) * radius, y: 80 - Math.cos(angle) * radius };
  };

  const land = marker(offshore, 58),
    sea = marker(offshore + 180, 58),
    parallel = marker(offshore + 90, 61),
    opposite = marker(offshore - 90, 61);
  const pointer = marker(direction, 52);
  return `<svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="61" class="compass-ring"/><text x="80" y="12" text-anchor="middle">N</text><text x="151" y="84" text-anchor="middle">E</text><text x="80" y="156" text-anchor="middle">S</text><text x="9" y="84" text-anchor="middle">W</text><line x1="${parallel.x}" y1="${parallel.y}" x2="${opposite.x}" y2="${opposite.y}" class="reference-shore"/><line x1="80" y1="80" x2="${land.x}" y2="${land.y}" class="reference-land"/><line x1="80" y1="80" x2="${sea.x}" y2="${sea.y}" class="reference-sea"/>${surface.slices
    .map((slice) => {
      const p = marker(slice.direction, 61);
      return `<circle cx="${p.x}" cy="${p.y}" r="4" class="wind-stored-dot"/>`;
    })
    .join(
      "",
    )}<line x1="80" y1="80" x2="${pointer.x}" y2="${pointer.y}" class="wind-dial-pointer"/><circle cx="${pointer.x}" cy="${pointer.y}" r="6" class="wind-dial-dot"/><circle cx="80" cy="80" r="3" class="compass-origin"/></svg>`;
};

export const dialBearing = (event: PointerEvent, element: HTMLElement): number => {
  const box = element.getBoundingClientRect();
  return wrapBearing(
    Math.round(
      (Math.atan2(
        event.clientX - box.left - box.width / 2,
        -(event.clientY - box.top - box.height / 2),
      ) *
        180) /
        Math.PI,
    ),
  );
};
