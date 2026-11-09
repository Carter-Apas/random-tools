export interface Spot {
  id: string;
  name: string;
  coast: string;
  latitude: number;
  longitude: number;
  marineLatitude: number;
  marineLongitude: number;
  offshoreFromDegrees: number;
  surfHeightFactor: number;
  calibrated: boolean;
  note: string;
  scoring: ScoringConfig;
}

export type ProfileActivity = "surfing" | "rockFishing" | "inshoreFishing";

export type VariableId =
  | "surfHeight"
  | "waveHeight"
  | "swellHeight"
  | "swellPeriod"
  | "swellDirection"
  | "windSpeed"
  | "windGust"
  | "windDirection"
  | "rain"
  | "rainProbability"
  | "waterTemperature"
  | "airTemperature"
  | "weatherCode"
  | "secondarySwellHeight"
  | "secondarySwellDirection";

export interface CurvePoint {
  x: number;
  y: number;
}

export interface PointCurve {
  variable: VariableId;
  enabled: boolean;
  interpolation: "linear" | "smooth" | "step";
  points: CurvePoint[];
}

export interface PointProfile {
  curves: PointCurve[];
}

export type ScoringConfig = Record<ProfileActivity, PointProfile>;

export type Scenario = Record<VariableId, number | null>;

export type SpotConfiguration = Omit<Spot, "id">;

export interface ConfigurationDocument {
  schemaVersion: 3;
  spots: Record<string, SpotConfiguration>;
}

export type Activity = "surfing" | "fishing" | "rockFishing" | "inshoreFishing";

export interface ConditionScore {
  value: number | null;
  label: string;
  points: number | null;
  maxPoints: number;
  factors: {
    variable: VariableId;
    name: string;
    input: number | null;
    points: number | null;
    maxPoints: number;
  }[];
  reasons: string[];
}

export type Scores = Record<Activity, ConditionScore>;

export interface ScoreSummary {
  average: number | null;
  scoredHours: number;
  daylightHours: number;
  bestHour: { localTime: string; value: number } | null;
}

export interface AdminSettings {
  spots: Spot[];
  defaults: Spot[];
  persistence: "file" | "memory";
}

export interface Swell {
  heightM: number | null;
  periodS: number | null;
  directionDeg: number | null;
  direction: string | null;
}

export interface ForecastHour {
  time: string;
  localTime: string;
  isDay: boolean | null;
  airTemperatureC: number | null;
  waterTemperatureC: number | null;
  precipitationMm: number | null;
  precipitationProbabilityPct: number | null;
  weatherCode: number | null;
  wind: {
    speedKmh: number | null;
    gustKmh: number | null;
    fromDeg: number | null;
    from: string | null;
    relative: string | null;
  };
  waves: Swell;
  primarySwell: Swell;
  secondarySwell: Swell;
  estimatedSurfHeightM: number | null;
  scores: Scores;
}

export interface Range {
  min: number;
  max: number;
}

export interface ForecastSummary {
  swellHeightM: Range | null;
  waveHeightM: Range | null;
  scores: Record<Activity, ScoreSummary>;
  estimatedSurfHeightM: Range | null;
  windSpeedKmh: Range | null;
  waterTemperatureC: Range | null;
  airTemperatureC: Range | null;
  precipitationTotalMm: number | null;
  lightestDaylightWind: { localTime: string; speedKmh: number; relative: string | null } | null;
}

export interface Forecast {
  spot: Spot;
  date: string;
  timezone: string;
  fetchedAt: string;
  stale: boolean;
  warnings: string[];
  source: {
    name: string;
    weather: string;
    marine: string;
    licence: string;
    modelGrid: {
      weather: { latitude: number; longitude: number } | null;
      marine: { latitude: number; longitude: number } | null;
    };
  };
  units: Record<string, string>;
  surfEstimate: { method: string; factor: number; calibrated: boolean; note: string };
  scoring: { version: string; scale: string; note: string };
  sunrise: string | null;
  sunset: string | null;
  firstLight: string | null;
  lastLight: string | null;
  summary: ForecastSummary;
  hours: ForecastHour[];
}

export interface ForecastCollection {
  date: string;
  timezone: string;
  forecasts: Forecast[];
  errors: { spot: string; message: string }[];
}

export interface OutlookPeriod {
  hour: 6 | 12 | 18;
  localTime: string | null;
  wind: ForecastHour["wind"] | null;
  scores: Record<ProfileActivity, number | null>;
}

export interface OutlookDay {
  date: string;
  fetchedAt: string | null;
  stale: boolean;
  warnings: string[];
  summary: ForecastSummary | null;
  periods: OutlookPeriod[];
  error: string | null;
}

export interface Outlook {
  spot: Pick<Spot, "id" | "name" | "coast">;
  timezone: string;
  startDate: string;
  endDate: string;
  days: OutlookDay[];
}
