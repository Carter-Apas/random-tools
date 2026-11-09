import { variables, profileActivities } from "../shared/variables.js";

export const curveSchema = {
  type: "object",
  additionalProperties: false,
  required: ["variable", "enabled", "interpolation", "points"],
  properties: {
    variable: { type: "string", enum: Object.keys(variables) },
    enabled: { type: "boolean" },
    interpolation: { enum: ["smooth", "linear", "step"] },
    points: {
      type: "array",
      minItems: 2,
      maxItems: 256,
      items: {
        type: "object",
        required: ["x", "y"],
        properties: {
          x: { type: "number" },
          y: { type: "number", minimum: -10000, maximum: 10000 },
        },
      },
    },
  },
  description:
    "Ordered unique input x values in the variable domain; signed point y values. Circular direction curves join at 0 and 360 degrees with equal y. Smooth interpolation is shape-preserving: the maximum equals the highest control-point y. Outside control points, endpoint values are held.",
};
export const scoringSchema = {
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    profileActivities.map((activity) => [
      activity,
      {
        type: "object",
        required: ["curves"],
        properties: {
          curves: { type: "array", maxItems: Object.keys(variables).length, items: curveSchema },
        },
      },
    ]),
  ),
};
const patchSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 100 },
    coast: { type: "string", minLength: 1, maxLength: 80 },
    note: { type: "string", minLength: 1, maxLength: 600 },
    latitude: { type: "number", minimum: -90, maximum: 90 },
    longitude: { type: "number", minimum: -180, maximum: 180 },
    marineLatitude: { type: "number", minimum: -90, maximum: 90 },
    marineLongitude: { type: "number", minimum: -180, maximum: 180 },
    surfHeightFactor: { type: "number", minimum: 0.1, maximum: 3 },
    offshoreFromDegrees: { type: "number", minimum: 0, maximum: 359 },
    calibrated: { type: "boolean" },
    scoring: scoringSchema,
  },
};
export const configurationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "spots"],
  properties: {
    schemaVersion: { const: 3 },
    spots: {
      type: "object",
      minProperties: 1,
      maxProperties: 32,
      propertyNames: { pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", maxLength: 64 },
      additionalProperties: { ...patchSchema, required: Object.keys(patchSchema.properties) },
    },
  },
};

const response = (description: string, schema: unknown = { type: "object" }) => ({
  description,
  content: { "application/json": { schema } },
});

const security = [{ adminSession: [] }];
const errorResponses = {
  400: response("Invalid input; configuration is unchanged."),
  401: response("Sign in first."),
  500: response("Persistence failed; configuration is unchanged."),
};
const authBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["password"],
        properties: { password: { type: "string", writeOnly: true } },
      },
    },
  },
};

export const adminPaths = {
  "/api/admin/session": {
    get: {
      operationId: "adminSession",
      summary: "Read signed-in and first-time setup state",
      responses: {
        200: response("Session state", {
          type: "object",
          properties: { configured: { type: "boolean" }, authenticated: { type: "boolean" } },
        }),
      },
    },
  },
  "/api/admin/setup": {
    post: {
      operationId: "setupAdmin",
      summary:
        "Choose the first admin password; unavailable after setup or when ADMIN_PASSWORD is set",
      requestBody: authBody,
      responses: {
        200: response("Password saved as a salted scrypt hash; HttpOnly session cookie set."),
        400: response("Password must be at least eight characters."),
        409: response("Already configured."),
      },
    },
  },
  "/api/admin/login": {
    post: {
      operationId: "loginAdmin",
      summary: "Sign in with the admin password",
      requestBody: authBody,
      responses: {
        200: response("Twelve-hour HttpOnly, SameSite=Strict session cookie set."),
        401: response("Incorrect password."),
      },
    },
  },
  "/api/admin/logout": {
    post: {
      operationId: "logoutAdmin",
      summary: "Invalidate the current session",
      responses: { 200: response("Session cleared.") },
    },
  },
  "/api/admin/settings": {
    get: {
      operationId: "getAdminSettings",
      security,
      summary: "Read current curves and reset defaults",
      responses: { 200: response("Settings and persistence mode"), 401: errorResponses[401] },
    },
  },
  "/api/admin/config": {
    get: {
      operationId: "exportConfiguration",
      security,
      summary: "Export configuration JSON; excludes credentials",
      responses: {
        200: response(
          "Version 3 places, sampling coordinates, orientation and curves",
          configurationSchema,
        ),
        401: errorResponses[401],
      },
    },
    put: {
      operationId: "importConfiguration",
      security,
      summary: "Atomically replace places, sampling coordinates, orientation and curves",
      description:
        "Maximum 2 MB. Every activity must have a positive sum of enabled maxima. Version 2 configurations and legacy threshold documents can be imported and are converted to curves. No executable expressions are accepted.",
      requestBody: {
        required: true,
        content: { "application/json": { schema: configurationSchema } },
      },
      responses: {
        200: response("Imported settings now apply to cached forecasts."),
        ...errorResponses,
      },
    },
  },
  "/api/admin/spots/{spot}": {
    parameters: [
      {
        name: "spot",
        in: "path",
        required: true,
        schema: { type: "string", description: "A configured place ID from /api/spots." },
      },
    ],
    put: {
      operationId: "updateSpotSettings",
      security,
      summary: "Update place calibration or replace activity curve arrays",
      requestBody: { required: true, content: { "application/json": { schema: patchSchema } } },
      responses: { 200: response("Updated spot."), ...errorResponses },
    },
    delete: {
      operationId: "resetSpotSettings",
      security,
      summary: "Reset a place to startup defaults",
      responses: { 200: response("Reset spot."), ...errorResponses },
    },
  },
};
