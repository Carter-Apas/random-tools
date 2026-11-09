import type { ProfileActivity, Scenario, VariableId } from "./types.js";

export interface VariableDefinition {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  circular?: boolean;
  note: string;
}

export const variables: Record<VariableId, VariableDefinition> = {
  windSpeed: {
    label: "Wind speed",
    unit: "km/h",
    min: 0,
    max: 100,
    step: 1,
    note: "Sustained wind at 10 metres.",
  },
  windDirection: {
    label: "Wind direction",
    unit: "°",
    min: 0,
    max: 360,
    step: 1,
    circular: true,
    note: "Direction the wind comes FROM. North is 0°, east 90°, south 180°, west 270°. The curve joins at north.",
  },
  windGust: {
    label: "Wind gusts",
    unit: "km/h",
    min: 0,
    max: 150,
    step: 1,
    note: "Maximum forecast gust speed.",
  },
  swellHeight: {
    label: "Primary swell height",
    unit: "m",
    min: 0,
    max: 15,
    step: 0.1,
    note: "Primary offshore swell component.",
  },
  swellDirection: {
    label: "Swell direction",
    unit: "°",
    min: 0,
    max: 360,
    step: 1,
    circular: true,
    note: "Direction the primary swell comes FROM, in degrees true. The curve joins at north.",
  },
  swellPeriod: {
    label: "Swell period",
    unit: "s",
    min: 0,
    max: 30,
    step: 0.5,
    note: "Mean period of the primary swell.",
  },
  waveHeight: {
    label: "Total wave height",
    unit: "m",
    min: 0,
    max: 15,
    step: 0.1,
    note: "Raw combined significant wave height. No surf multiplier is applied.",
  },
  surfHeight: {
    label: "Estimated surf height",
    unit: "m",
    min: 0,
    max: 15,
    step: 0.1,
    note: "Total wave height multiplied by this place’s calibration factor.",
  },
  rain: {
    label: "Rain",
    unit: "mm/h",
    min: 0,
    max: 50,
    step: 0.1,
    note: "Precipitation accumulated over the preceding hour.",
  },
  rainProbability: {
    label: "Rain probability",
    unit: "%",
    min: 0,
    max: 100,
    step: 1,
    note: "Probability of precipitation.",
  },
  waterTemperature: {
    label: "Water temperature",
    unit: "°C",
    min: -5,
    max: 40,
    step: 0.5,
    note: "Modelled sea-surface temperature.",
  },
  airTemperature: {
    label: "Air temperature",
    unit: "°C",
    min: -10,
    max: 45,
    step: 0.5,
    note: "Air temperature at two metres.",
  },
  weatherCode: {
    label: "Weather code",
    unit: "WMO",
    min: 0,
    max: 99,
    step: 1,
    note: "WMO code: 0 clear, 3 overcast, 51–67 drizzle/rain, 80–82 showers, 95–99 thunderstorms. Step interpolation suits categories.",
  },
  secondarySwellHeight: {
    label: "Secondary swell height",
    unit: "m",
    min: 0,
    max: 15,
    step: 0.1,
    note: "Height of the secondary swell component.",
  },
  secondarySwellDirection: {
    label: "Secondary swell direction",
    unit: "°",
    min: 0,
    max: 360,
    step: 1,
    circular: true,
    note: "Direction the secondary swell comes FROM.",
  },
};

export const profileActivities: ProfileActivity[] = ["surfing", "rockFishing", "inshoreFishing"];
export const activityNames: Record<ProfileActivity, string> = {
  surfing: "Surfing",
  rockFishing: "Rock fishing",
  inshoreFishing: "Inshore boat fishing",
};

export const initialScenario = (): Scenario => ({
  surfHeight: 1.2,
  waveHeight: 1.2,
  swellHeight: 1.1,
  swellPeriod: 12,
  swellDirection: 240,
  windSpeed: 8,
  windGust: 14,
  windDirection: 90,
  rain: 0,
  rainProbability: 10,
  waterTemperature: 18,
  airTemperature: 20,
  weatherCode: 1,
  secondarySwellHeight: 0.2,
  secondarySwellDirection: 300,
});
