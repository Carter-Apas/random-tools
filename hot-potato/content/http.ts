import { setTimeout } from "node:timers/promises";

const retryDelay = (response: Response): number => {
  const header = response.headers.get("retry-after");
  if (!header) return 65000;
  const seconds = Number(header);
  return Number.isFinite(seconds)
    ? Math.max(0, seconds * 1000)
    : Math.max(0, Date.parse(header) - Date.now());
};

export const fetchSourceText = async (
  url: URL | string,
  fetcher: typeof fetch = fetch,
): Promise<string> => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetcher(url, {
      headers: {
        "User-Agent": "HotPotatoCategoryBuilder/1.0 (https://github.com/carter-apas/random-tools)",
        Accept: "application/sparql-results+json, text/html;q=0.9",
      },
      signal: AbortSignal.timeout(45000),
    });
    if (response.ok) return response.text();
    if (![429, 502, 503, 504].includes(response.status) || attempt === 2)
      throw new Error(`Source returned HTTP ${response.status}: ${new URL(url).hostname}`);
    const delay = retryDelay(response);
    if (!Number.isFinite(delay) || delay > 120000)
      throw new Error("Source requested a longer retry interval; retry the import later");
    console.info(
      `Source busy (HTTP ${response.status}); respecting ${Math.ceil(delay / 1000)}s retry interval.`,
    );
    await setTimeout(delay);
  }
  throw new Error("Source unavailable");
};
