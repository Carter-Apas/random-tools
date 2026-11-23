import { curveSvg, graphView } from "./curve-graph";
import { number } from "./format";

import {
  compileWindSurface,
  surfaceCurve,
  windMaximum,
  usesWindSurface,
} from "../shared/wind-surface";
import type { PointProfile, Scenario } from "../shared/types";

export const windCard = (profile: PointProfile, inputs: Scenario): string => {
  const surface = profile.windSurface;
  if (!usesWindSurface(profile) || !surface) return "";
  const direction = inputs.windDirection ?? 0;
  const curve = surfaceCurve(surface, direction);
  const points =
    inputs.windSpeed === null || inputs.windDirection === null
      ? null
      : compileWindSurface(surface)(inputs.windSpeed, inputs.windDirection);
  return `<article class="variable-card wind-surface-card${surface.enabled ? "" : " is-disabled"}"><label class="variable-toggle"><input type="checkbox" data-enable-wind="true" aria-label="Include wind surface" ${surface.enabled ? "checked" : ""}/></label><button type="button" class="variable-open" data-open-wind><span class="variable-copy"><strong>Wind speed × direction <span class="wind-inline-badge">3D</span></strong><small>${surface.enabled ? `${number(points)} earned / ${number(windMaximum(surface))} maximum pts` : "Excluded · open to edit surface"}</small></span>${curveSvg(curve, graphView(curve, true), { mini: true, idPrefix: "wind-card-" })}<span class="variable-chevron" aria-hidden="true">↗</span></button></article>`;
};
