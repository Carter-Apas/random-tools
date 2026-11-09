import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { IncomingMessage } from "node:http";
import { dirname } from "node:path";
import { promisify } from "node:util";

import { InvalidRequest, readJson } from "./http-json.js";

import { asRecord } from "../shared/config-validation.js";

interface PasswordRecord {
  salt: string;
  hash: string;
}

interface AuthOptions {
  password?: string;
  path?: string;
  now?: () => number;
}

export interface AdminAuth {
  authorized: (request: IncomingMessage) => boolean;
  route: (
    request: IncomingMessage,
    path: string,
  ) => Promise<{ status: number; body: unknown; cookie?: string } | null>;
}

const derive = promisify(scrypt);
const sessionLifetime = 12 * 60 * 60 * 1000;

const token = (request: IncomingMessage) =>
  request.headers.cookie
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("coast_admin="))
    ?.slice(12);

const digest = (value: string) => createHash("sha256").update(value).digest();

export const createAdminAuth = async ({
  password,
  path,
  now = Date.now,
}: AuthOptions = {}): Promise<AdminAuth> => {
  let stored = password ? undefined : await loadPassword(path);
  const sessions = new Map<string, number>();

  const authorized = (request: IncomingMessage): boolean => {
    for (const [id, expiry] of sessions) if (expiry <= now()) sessions.delete(id);
    return (sessions.get(token(request) ?? "") ?? 0) > now();
  };

  const cookie = (request: IncomingMessage, id: string, age: number) =>
    `coast_admin=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${request.headers["x-forwarded-proto"] === "https" || "encrypted" in request.socket ? "; Secure" : ""}`;

  const establish = (request: IncomingMessage) => {
    const id = randomBytes(32).toString("hex");
    sessions.set(id, now() + sessionLifetime);
    return {
      status: 200,
      body: { authenticated: true, configured: true },
      cookie: cookie(request, id, sessionLifetime / 1000),
    };
  };

  const setPassword = async (value: string) => {
    const salt = randomBytes(16).toString("hex");
    const hash = ((await derive(value, salt, 64)) as Buffer).toString("hex");
    const record = { salt, hash };
    if (path) {
      await mkdir(dirname(path), { recursive: true });
      try {
        await writeFile(path, `${JSON.stringify(record)}\n`, { mode: 0o600, flag: "wx" });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST")
          throw new InvalidRequest("An admin password is already configured. Reload and sign in.");
        throw error;
      }
    }
    stored = record;
  };

  const attempt = async (request: IncomingMessage, isSetup: boolean) => {
    const value = await passwordFromRequest(request);
    if (isSetup) {
      if (password || stored)
        return {
          status: 409,
          body: {
            error: { code: "configured", message: "A password is already configured. Sign in." },
          },
        };
      if (value.length < 8) throw new InvalidRequest("Use a password with at least 8 characters.");
      await setPassword(value);
      return establish(request);
    }
    const valid = password
      ? timingSafeEqual(digest(password), digest(value))
      : stored
        ? timingSafeEqual(
            Buffer.from(stored.hash, "hex"),
            (await derive(value, stored.salt, 64)) as Buffer,
          )
        : false;
    return valid
      ? establish(request)
      : { status: 401, body: { error: { code: "unauthorized", message: "Incorrect password." } } };
  };

  const route = async (request: IncomingMessage, routePath: string) => {
    if (routePath === "/api/admin/session" && request.method === "GET")
      return {
        status: 200,
        body: { authenticated: authorized(request), configured: !!(password || stored) },
      };
    if (!["/api/admin/login", "/api/admin/setup", "/api/admin/logout"].includes(routePath))
      return null;
    if (request.method !== "POST")
      return { status: 405, body: { error: { code: "method_not_allowed", message: "Use POST." } } };
    if (routePath.endsWith("/logout")) {
      sessions.delete(token(request) ?? "");
      return { status: 200, body: { authenticated: false }, cookie: cookie(request, "", 0) };
    }
    return attempt(request, routePath.endsWith("/setup"));
  };

  return { authorized, route };
};

const loadPassword = async (path?: string): Promise<PasswordRecord | undefined> => {
  if (!path) return undefined;
  try {
    const data = asRecord(JSON.parse(await readFile(path, "utf8")), "Password record");
    if (
      typeof data.salt !== "string" ||
      typeof data.hash !== "string" ||
      !/^[a-f0-9]{128}$/.test(data.hash) ||
      !/^[a-f0-9]{32}$/.test(data.salt)
    )
      throw new Error("Invalid saved admin password record.");
    return { salt: data.salt, hash: data.hash };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  return undefined;
};

const passwordFromRequest = async (request: IncomingMessage): Promise<string> => {
  const payload = await readJson(request);
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    throw new InvalidRequest("Enter a password.");
  const body = payload as Record<string, unknown>;
  if (typeof body.password !== "string" || body.password.length > 1024)
    throw new InvalidRequest("Enter a password.");
  return body.password;
};
