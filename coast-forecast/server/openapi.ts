import { adminPaths, scoringSchema } from "./openapi-admin.js";

const nullableNumber = { type: ["number", "null"] };
const score = {
  type: "object",
  required: ["value", "label", "points", "maxPoints", "factors", "reasons"],
  properties: {
    value: { type: ["integer", "null"], minimum: 0, maximum: 100 },
    label: { enum: ["Excellent", "Good", "Fair", "Poor", "Unavailable"] },
    points: {
      type: ["number", "null"],
      description: "Signed sum of earned curve points before normalization.",
    },
    maxPoints: { type: "number", description: "Sum of true maxima of all enabled curves." },
    factors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          variable: { type: "string" },
          name: { type: "string" },
          input: nullableNumber,
          points: nullableNumber,
          maxPoints: { type: "number" },
        },
      },
    },
    reasons: { type: "array", items: { type: "string" } },
  },
};
const scores = {
  type: "object",
  description:
    "curves-v2 conditions preferences. Fishing is the minimum of rock and inshore scores; required missing data gives null. Not a catch prediction or safety rating.",
  properties: Object.fromEntries(
    ["surfing", "fishing", "rockFishing", "inshoreFishing"].map((key) => [key, score]),
  ),
};
const range = {
  type: ["object", "null"],
  properties: { min: { type: "number" }, max: { type: "number" } },
};
const summaryScore = {
  type: "object",
  properties: {
    average: { type: ["integer", "null"], minimum: 0, maximum: 100 },
    scoredHours: { type: "integer" },
    daylightHours: { type: "integer" },
    bestHour: {
      type: ["object", "null"],
      properties: {
        localTime: { type: "string" },
        value: { type: "integer", minimum: 0, maximum: 100 },
      },
    },
  },
};
const swell = {
  type: "object",
  properties: {
    heightM: nullableNumber,
    periodS: nullableNumber,
    directionDeg: nullableNumber,
    direction: { type: ["string", "null"] },
  },
};
const forecast = {
  type: "object",
  required: ["spot", "date", "timezone", "fetchedAt", "stale", "warnings", "hours"],
  properties: {
    spot: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        surfHeightFactor: { type: "number" },
        offshoreFromDegrees: { type: "number" },
        scoring: scoringSchema,
      },
    },
    date: { type: "string", format: "date" },
    timezone: { const: "Pacific/Auckland" },
    fetchedAt: { type: "string", format: "date-time" },
    stale: { type: "boolean" },
    warnings: { type: "array", items: { type: "string" } },
    sunrise: {
      type: ["string", "null"],
      description: "Local time in Pacific/Auckland, without offset.",
    },
    sunset: { type: ["string", "null"] },
    firstLight: {
      type: ["string", "null"],
      description:
        "Civil dawn (Sun centre 6° below the horizon), calculated at the spot coordinates for the requested date. Pacific/Auckland wall time (YYYY-MM-DDTHH:mm). Does not account for clouds or terrain.",
    },
    lastLight: {
      type: ["string", "null"],
      description:
        "Civil dusk (Sun centre 6° below the horizon), calculated at the spot coordinates for the requested date. Pacific/Auckland wall time (YYYY-MM-DDTHH:mm). Does not account for clouds or terrain.",
    },
    source: {
      type: "object",
      description: "Attribution and actual weather/marine grid coordinates.",
    },
    units: { type: "object" },
    summary: {
      type: "object",
      description: "Full-day ranges and daylight-only score averages, best hours and coverage.",
      properties: {
        waveHeightM: range,
        swellHeightM: range,
        estimatedSurfHeightM: range,
        windSpeedKmh: range,
        waterTemperatureC: range,
        airTemperatureC: range,
        precipitationTotalMm: nullableNumber,
        scores: {
          type: "object",
          properties: Object.fromEntries(
            ["surfing", "fishing", "rockFishing", "inshoreFishing"].map((key) => [
              key,
              summaryScore,
            ]),
          ),
        },
        lightestDaylightWind: { type: ["object", "null"] },
      },
    },
    scoring: {
      type: "object",
      properties: {
        version: { const: "curves-v2" },
        scale: { type: "string" },
        note: { type: "string" },
      },
    },
    surfEstimate: {
      type: "object",
      description:
        "Explicitly labelled wave-height multiplier proxy, with calibration state and limitations.",
    },
    hours: {
      type: "array",
      items: {
        type: "object",
        properties: {
          time: { type: "string", format: "date-time", description: "UTC instant." },
          localTime: {
            type: "string",
            description: "Pacific/Auckland wall time (YYYY-MM-DDTHH:mm).",
          },
          isDay: { type: ["boolean", "null"] },
          airTemperatureC: nullableNumber,
          waterTemperatureC: nullableNumber,
          precipitationMm: { ...nullableNumber, description: "Preceding-hour accumulation." },
          precipitationProbabilityPct: nullableNumber,
          weatherCode: nullableNumber,
          estimatedSurfHeightM: nullableNumber,
          scores,
          wind: {
            type: "object",
            properties: {
              speedKmh: nullableNumber,
              gustKmh: nullableNumber,
              fromDeg: nullableNumber,
              from: { type: ["string", "null"] },
              relative: { type: ["string", "null"] },
            },
          },
          waves: swell,
          primarySwell: swell,
          secondarySwell: swell,
        },
      },
    },
  },
};

const response = (description: string, schema: unknown) => ({
  description,
  content: { "application/json": { schema } },
});

const error = {
  type: "object",
  properties: {
    error: {
      type: "object",
      properties: { code: { type: "string" }, message: { type: "string" } },
    },
  },
};

export const openapi = {
  openapi: "3.1.0",
  info: {
    title: "Coast forecast API",
    version: "2.0.0",
    description:
      "Hourly marine and weather forecasts for Piha / Māori Bay and Te Ārai. Defaults to tomorrow in Pacific/Auckland. All missing measurements are null; zero means a measured/modelled zero. Forecast routes are public; admin configuration routes require a password session. Unversioned /api routes are aliases.",
  },
  servers: [{ url: "/" }],
  paths: {
    ...adminPaths,
    "/api/v1/spots": {
      get: {
        operationId: "listSpots",
        summary: "List forecast locations and server calibration defaults",
        responses: {
          200: response("Locations", {
            type: "object",
            properties: {
              timezone: { type: "string" },
              spots: { type: "array", items: { type: "object" } },
            },
          }),
        },
      },
    },
    "/api/v1/forecast": {
      get: {
        operationId: "getForecast",
        summary: "Get hourly forecasts for one or both coasts",
        parameters: [
          {
            name: "spot",
            in: "query",
            schema: { type: "string", enum: ["piha", "te-arai"] },
            description:
              "Omit to return both forecasts in a forecasts array. Set to return a single forecast object.",
          },
          {
            name: "date",
            in: "query",
            schema: { type: "string", default: "tomorrow" },
            description: "today, tomorrow, or YYYY-MM-DD within today + six days, Auckland-local.",
          },
          {
            name: "surf_factor",
            in: "query",
            schema: { type: "number", minimum: 0.1, maximum: 3 },
            description:
              "Optional per-request multiplier. Requires spot. Overrides are marked uncalibrated.",
          },
          {
            name: "offshore_from",
            in: "query",
            schema: { type: "number", minimum: 0, maximum: 359 },
            description:
              "Optional wind FROM bearing representing directly offshore. Requires spot.",
          },
        ],
        responses: {
          200: response(
            "Forecast. Check warnings, stale, null values, and combined-response errors for partial availability.",
            {
              oneOf: [
                { $ref: "#/components/schemas/Forecast" },
                {
                  type: "object",
                  properties: {
                    date: { type: "string" },
                    timezone: { type: "string" },
                    forecasts: { type: "array", items: { $ref: "#/components/schemas/Forecast" } },
                    errors: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: { spot: { type: "string" }, message: { type: "string" } },
                      },
                    },
                  },
                },
              ],
            },
          ),
          400: response("Invalid parameters", error),
          503: response("No forecast available", {
            oneOf: [
              error,
              {
                type: "object",
                properties: {
                  forecasts: { type: "array", maxItems: 0 },
                  errors: { type: "array", items: { type: "object" } },
                },
              },
            ],
          }),
        },
      },
    },
    "/healthz": {
      get: {
        operationId: "health",
        summary: "Process liveness, independent of upstream providers",
        responses: {
          200: response("Healthy", { type: "object", properties: { status: { const: "ok" } } }),
        },
      },
    },
  },
  components: {
    securitySchemes: { adminSession: { type: "apiKey", in: "cookie", name: "coast_admin" } },
    schemas: {
      Forecast: forecast,
      ConditionScore: score,
      Scores: scores,
      ScoringConfig: scoringSchema,
    },
  },
};
