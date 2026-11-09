import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";

import { forecastDate, timezone } from "./dates.js";
import { ForecastUnavailable } from "./forecast.js";
import { tuneSpot } from "./spots.js";
import { openapi } from "./openapi.js";
import { protectedAdminResponse } from "./admin-gate.js";
import { memorySettings } from "./settings.js";
import type { SettingsStore } from "./settings.js";
import { createAdminAuth } from "./auth.js";
import type { AdminAuth } from "./auth.js";
import { InvalidRequest } from "./http-json.js";

import type { Forecast, Spot } from "../shared/types.js";

const mime: Record<string, string> = {
  html: "text/html",
  js: "text/javascript",
  css: "text/css",
  svg: "image/svg+xml",
  woff2: "font/woff2",
};

type GetForecast = (spot: Spot, date: string) => Promise<Forecast>;

const json = (response: ServerResponse, status: number, body: unknown, head = false) => {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(head ? undefined : JSON.stringify(body, null, 2));
};

export const createHandler = ({
  spots,
  getForecast,
  now = () => new Date(),
  settings,
  auth,
}: {
  spots: Spot[];
  getForecast: GetForecast;
  now?: () => Date;
  settings?: SettingsStore;
  auth?: AdminAuth;
}) => {
  const store = settings ?? memorySettings(spots);
  const authPromise = auth ? Promise.resolve(auth) : createAdminAuth();
  return async (request: IncomingMessage, response: ServerResponse) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "same-origin");
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    );
    const head = request.method === "HEAD";
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      const path = url.pathname.replace(/^\/api\/v1\//, "/api/");
      if (path.startsWith("/api/admin/")) {
        const result = await protectedAdminResponse(request, path, store, await authPromise);
        if (result.cookie) response.setHeader("Set-Cookie", result.cookie);
        if (result.allow) response.setHeader("Allow", result.allow);
        json(response, result.status, result.body, head);
        return;
      }
      if (!["GET", "HEAD"].includes(request.method ?? "")) {
        response.setHeader("Allow", "GET, HEAD");
        json(response, 405, { error: { code: "method_not_allowed", message: "Use GET or HEAD." } });
        return;
      }
      if (path === "/healthz") json(response, 200, { status: "ok" }, head);
      else if (path === "/api/spots")
        json(response, 200, { timezone, spots: store.read().spots }, head);
      else if (path === "/api/openapi.json") json(response, 200, openapi, head);
      else if (path === "/api/forecast") {
        const result = await forecastResponse(
          url.searchParams,
          store.read().spots,
          getForecast,
          now(),
        );
        json(response, result.status, result.body, head);
      } else if (
        ["/", "/admin", "/admin/", "/favicon.svg"].includes(path) ||
        /^\/assets\/[\w.-]+$/.test(path)
      )
        await serveFile(response, path, head);
      else
        json(
          response,
          404,
          { error: { code: "not_found", message: "Endpoint not found. See /api/openapi.json." } },
          head,
        );
    } catch (error) {
      if (isInvalidRequest(error)) {
        json(response, 400, { error: { code: "invalid_request", message: error.message } }, head);
        return;
      }
      const unavailable = error instanceof ForecastUnavailable;
      console.error(unavailable ? error.message : "Request failed", unavailable ? "" : error);
      json(
        response,
        unavailable ? 503 : 500,
        {
          error: {
            code: unavailable ? "forecast_unavailable" : "internal_error",
            message: unavailable ? error.message : "Unable to complete the request.",
          },
        },
        head,
      );
    }
  };
};

const isInvalidRequest = (error: unknown): error is InvalidRequest | SyntaxError =>
  error instanceof InvalidRequest || error instanceof SyntaxError;

const forecastResponse = async (
  params: URLSearchParams,
  spots: Spot[],
  getForecast: GetForecast,
  now: Date,
) => {
  let selected: Spot[];
  let date: string;
  try {
    for (const key of params.keys()) {
      if (!["spot", "date", "surf_factor", "offshore_from"].includes(key))
        throw new Error(`Unknown parameter: ${key}`);
      if (params.getAll(key).length > 1) throw new Error(`Parameter must appear once: ${key}`);
    }
    date = forecastDate(params.get("date") ?? "tomorrow", now);
    const id = params.get("spot");
    selected = id === null ? spots : spots.filter((spot) => spot.id === id);
    if (!selected.length) throw new Error("Unknown spot. Use piha or te-arai.");
    if (!id && (params.has("surf_factor") || params.has("offshore_from")))
      throw new Error("Select a spot when applying tuning parameters.");
    selected = selected.map((spot) => tuneSpot(spot, params));
  } catch (error) {
    return {
      status: 400,
      body: {
        error: {
          code: "invalid_request",
          message: error instanceof Error ? error.message : "Invalid parameters.",
        },
      },
    };
  }
  if (params.has("spot")) return { status: 200, body: await getForecast(selected[0], date) };
  const results = await Promise.allSettled(selected.map((spot) => getForecast(spot, date)));
  const forecasts = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  const errors = results.flatMap((result, index) =>
    result.status === "rejected"
      ? [{ spot: selected[index].id, message: "Forecast unavailable. Try again shortly." }]
      : [],
  );
  return { status: forecasts.length ? 200 : 503, body: { date, timezone, forecasts, errors } };
};

const serveFile = async (response: ServerResponse, path: string, head: boolean) => {
  const file =
    path === "/" ? "index.html" : path.startsWith("/admin") ? "admin/index.html" : path.slice(1);
  try {
    const body = await readFile(new URL(`../../client/${file}`, import.meta.url));
    const extension = file.split(".").at(-1) ?? "";
    response.writeHead(200, {
      "Content-Type": mime[extension] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(head ? undefined : body);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    json(
      response,
      404,
      {
        error: {
          code: "not_found",
          message: "File not found. Build the frontend before starting the production server.",
        },
      },
      head,
    );
  }
};
