import { number } from "./format";

import { directionReferences, wrapBearing } from "../shared/orientation";

export const directionGuide = (offshore: number): string => {
  const sea = wrapBearing(offshore + 180);
  return `<svg class="direction-compass" viewBox="0 0 112 112" role="img" aria-label="Shoreline reference: offshore wind from ${number(offshore, 0)} degrees; sea lies at ${number(sea, 0)} degrees."><circle cx="56" cy="56" r="39" class="compass-ring"/><text x="56" y="10" text-anchor="middle">N</text><g transform="rotate(${offshore},56,56)"><line x1="16" y1="56" x2="96" y2="56" class="reference-shore"/><line x1="56" y1="56" x2="56" y2="21" class="reference-land"/><path d="M52 27L56 20L60 27" class="reference-land"/><line x1="56" y1="56" x2="56" y2="91" class="reference-sea"/><path d="M52 84L56 92L60 84" class="reference-sea"/></g><circle cx="56" cy="56" r="3" class="compass-origin"/></svg><div class="direction-legend">${directionReferences(
    offshore,
  )
    .slice(0, 3)
    .map(
      (reference) =>
        `<span class="direction-label direction-${reference.kind}"><i></i>${reference.label} <strong>${number(reference.bearing, 0)}°${reference.kind === "shore" ? ` / ${number(wrapBearing(reference.bearing + 180), 0)}°` : ""}</strong></span>`,
    )
    .join("")}</div>`;
};
