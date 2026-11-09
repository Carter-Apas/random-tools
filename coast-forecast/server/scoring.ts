import { simulate } from "../shared/point-scoring.js";
import type {
  Activity,
  ForecastHour,
  Scenario,
  ScoreSummary,
  Scores,
  Spot,
} from "../shared/types.js";

export { scoreLabel } from "../shared/point-scoring.js";

export const scenarioFromHour = (hour: Omit<ForecastHour, "scores">): Scenario => ({
  surfHeight: hour.estimatedSurfHeightM,
  waveHeight: hour.waves.heightM,
  swellHeight: hour.primarySwell.heightM,
  swellPeriod: hour.primarySwell.periodS,
  swellDirection: hour.primarySwell.directionDeg,
  windSpeed: hour.wind.speedKmh,
  windGust: hour.wind.gustKmh,
  windDirection: hour.wind.fromDeg,
  rain: hour.precipitationMm,
  rainProbability: hour.precipitationProbabilityPct,
  waterTemperature: hour.waterTemperatureC,
  airTemperature: hour.airTemperatureC,
  weatherCode: hour.weatherCode,
  secondarySwellHeight: hour.secondarySwell.heightM,
  secondarySwellDirection: hour.secondarySwell.directionDeg,
});

export const scoreHour = (hour: Omit<ForecastHour, "scores">, spot: Spot): Scores =>
  simulate(spot, scenarioFromHour(hour));

export const summarizeScores = (hours: ForecastHour[], activity: Activity): ScoreSummary => {
  const daylight = hours.filter((hour) => hour.isDay === true);
  const scored = daylight.filter((hour) => hour.scores[activity].value !== null);
  const best = scored.reduce<ForecastHour | null>(
    (current, hour) =>
      !current || hour.scores[activity].value! > current.scores[activity].value! ? hour : current,
    null,
  );
  return {
    average: scored.length
      ? Math.round(
          scored.reduce((sum, hour) => sum + hour.scores[activity].value!, 0) / scored.length,
        )
      : null,
    scoredHours: scored.length,
    daylightHours: daylight.length,
    bestHour: best ? { localTime: best.localTime, value: best.scores[activity].value! } : null,
  };
};
