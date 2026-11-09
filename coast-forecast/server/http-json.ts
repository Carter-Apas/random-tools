import type { IncomingMessage } from "node:http";

export class InvalidRequest extends Error {}

export const readJson = async (request: IncomingMessage): Promise<unknown> => {
  let body = "";
  let bytes = 0;
  for await (const chunk of request) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > 2 * 1024 * 1024) throw new InvalidRequest("JSON payload is larger than 2 MB.");
    body += String(chunk);
  }
  return JSON.parse(body) as unknown;
};
