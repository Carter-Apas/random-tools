import { escape, number } from "./format";

import type { Activity, ForecastSummary, Scores } from "../shared/types";

export const activities: [Activity, string][] = [
  ["surfing", "Surfing"],
  ["rockFishing", "Rock fishing"],
  ["inshoreFishing", "Inshore boat fishing"],
];

export const scoreCards = (scores: Scores): string =>
  activities
    .map(([key, label]) => {
      const score = scores[key];
      const tone =
        score.value === null
          ? "unknown"
          : score.value >= 60
            ? "good"
            : score.value >= 40
              ? "fair"
              : "poor";
      const factors = score.factors
        .map(
          (factor) =>
            `<li><span>${escape(factor.name)} <small>max ${number(factor.maxPoints)} pts</small></span><strong>${number(factor.points)} pts</strong></li>`,
        )
        .join("");
      return `<article class="score-card" data-tone="${tone}"><h4>${label}</h4><p class="score-number">${number(score.value, 0)}<span>/100</span><b>${escape(score.label)}</b></p><details><summary>Why this score?</summary><ul class="score-factors">${factors}</ul>${score.reasons.map((reason) => `<p>${escape(reason)}</p>`).join("")}</details></article>`;
    })
    .join("");

export const coastScores = (scores: ForecastSummary["scores"]): string =>
  `<span class="coast-scores">${activities.map(([key, label]) => `<span>${label.replace("Inshore boat fishing", "Inshore").replace("Rock fishing", "Rocks").replace("Surfing", "Surf")} <strong>${number(scores[key].average, 0)}</strong></span>`).join("")}</span><span class="daylight-label">Daylight averages /100</span>`;
