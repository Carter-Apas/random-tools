const nullableScore = { type: ["integer", "null"], minimum: 0, maximum: 100 };

export const outlookSchema = {
  type: "object",
  required: ["spot", "timezone", "startDate", "endDate", "days"],
  properties: {
    spot: {
      type: "object",
      required: ["id", "name", "coast"],
      properties: { id: { type: "string" }, name: { type: "string" }, coast: { type: "string" } },
    },
    timezone: { const: "Pacific/Auckland" },
    startDate: { type: "string", format: "date" },
    endDate: { type: "string", format: "date" },
    days: {
      type: "array",
      minItems: 7,
      maxItems: 7,
      items: {
        type: "object",
        required: ["date", "fetchedAt", "stale", "warnings", "summary", "periods", "error"],
        properties: {
          date: { type: "string", format: "date" },
          fetchedAt: { type: ["string", "null"], format: "date-time" },
          stale: { type: "boolean" },
          warnings: { type: "array", items: { type: "string" } },
          error: { type: ["string", "null"] },
          summary: {
            anyOf: [{ type: "null" }, { $ref: "#/components/schemas/Forecast/properties/summary" }],
          },
          periods: {
            type: "array",
            maxItems: 3,
            items: {
              type: "object",
              required: ["hour", "localTime", "wind", "scores"],
              properties: {
                hour: { type: "integer", enum: [6, 12, 18] },
                localTime: {
                  type: ["string", "null"],
                  description: "Auckland wall time, or null when the exact hour is unavailable.",
                },
                wind: {
                  anyOf: [
                    { type: "null" },
                    {
                      $ref: "#/components/schemas/Forecast/properties/hours/items/properties/wind",
                    },
                  ],
                },
                scores: {
                  type: "object",
                  properties: {
                    surfing: nullableScore,
                    rockFishing: nullableScore,
                    inshoreFishing: nullableScore,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const response = (description: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Outlook" } } },
});

export const outlookPaths = {
  "/api/v1/outlook": {
    get: {
      operationId: "getOutlook",
      summary: "Seven-day overview for one configured place",
      description:
        "Today through today + six days in Pacific/Auckland. Daily summaries plus exact 6am/noon/6pm wind and activity scores. Shares the hourly seven-day provider cache with /api/v1/forecast. Missing days retain their date with summary:null and an error. No additional upstream calls on date selection. /api/outlook is an alias; GET and HEAD are supported.",
      parameters: [
        {
          name: "spot",
          in: "query",
          required: true,
          schema: { type: "string" },
          description: "Configured place ID from /api/v1/spots.",
        },
      ],
      responses: {
        200: response(
          "Overview; inspect per-day errors, warnings and stale flags for partial availability.",
        ),
        400: {
          description: "Use exactly one valid spot parameter. No other parameters are accepted.",
        },
        503: response(
          "All seven days are unavailable. The body retains all seven dates and per-day errors.",
        ),
      },
    },
  },
};
