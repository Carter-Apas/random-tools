import { createServer } from "node:http";
import {
  getDefaultAutoSelectFamilyAttemptTimeout,
  setDefaultAutoSelectFamilyAttemptTimeout,
} from "node:net";
import { dirname, resolve } from "node:path";

import { createHandler } from "./app.js";
import { createForecastService } from "./forecast.js";
import { loadSpots } from "./spots.js";
import { loadSettings } from "./settings.js";
import { createAdminAuth } from "./auth.js";

setDefaultAutoSelectFamilyAttemptTimeout(
  Math.max(2000, getDefaultAutoSelectFamilyAttemptTimeout()),
);

const spots = await loadSpots();
const settingsPath = resolve(process.env.SETTINGS_FILE || ".data/settings.json");
const settings = await loadSettings(spots, settingsPath);
const auth = await createAdminAuth({
  password: process.env.ADMIN_PASSWORD,
  path: resolve(dirname(settingsPath), "admin-password.json"),
});
const port = Number(process.env.PORT || 5180);
const host = process.env.HOST || "0.0.0.0";
const server = createServer(
  createHandler({
    spots,
    settings,
    auth,
    getForecast: createForecastService({ apiKey: process.env.OPEN_METEO_API_KEY }),
  }),
);
server.listen(port, host, () => console.log(`Coast forecast: http://localhost:${port}`));
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    server.closeIdleConnections();
  });
}
