import { element } from "./format";
import { outlookCard } from "./outlook-view";

import type { Outlook, OutlookDay, ProfileActivity, Spot } from "../shared/types";

const datedDays = (start: string): OutlookDay[] =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${start}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      fetchedAt: null,
      stale: false,
      warnings: [],
      summary: null,
      periods: [],
      error: null,
    };
  });

export class OutlookStrip {
  private cache = new Map<string, Outlook>();
  private controller?: AbortController;
  private key = "";
  private today = "";
  private date = "";
  private data?: Outlook;
  private activity: ProfileActivity = "surfing";
  private loading = false;
  private error = "";

  constructor(private _chooseDate: (date: string) => void) {
    element("outlook-days").addEventListener("click", (event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLButtonElement>("[data-date]")
          : null;
      if (!target?.dataset.date || target.disabled) return;
      this.setDate(target.dataset.date);
      this._chooseDate(target.dataset.date);
    });
    element("outlook-activities").addEventListener("click", (event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLButtonElement>("[data-outlook-activity]")
          : null;
      if (!target?.dataset.outlookActivity) return;
      this.activity = target.dataset.outlookActivity as ProfileActivity;
      this._render();
    });
    element("outlook-retry").addEventListener("click", () => {
      if (!this.key) return;
      void this._fetch(this.key.split(":")[0], this.key);
    });
  }

  clear(): void {
    this.controller?.abort();
    this.cache.clear();
    this.key = "";
    this.data = undefined;
  }

  show(spot: Spot, date: string, today: string): void {
    const key = `${spot.id}:${today}:${spot.latitude}:${spot.longitude}:${spot.marineLatitude}:${spot.marineLongitude}`;
    this.date = date;
    this.today = today;
    element("week-outlook").hidden = false;
    element("outlook-place").textContent = spot.name;
    if (key === this.key) {
      this.setDate(date);
      return;
    }
    this.controller?.abort();
    this.key = key;
    this.data = this.cache.get(key);
    this.error = "";
    if (this.data) {
      this.loading = false;
      this._render();
    } else void this._fetch(spot.id, key);
  }

  setDate(date: string): void {
    this.date = date;
    element("outlook-days")
      .querySelectorAll<HTMLButtonElement>("[data-date]")
      .forEach((button) =>
        button.setAttribute("aria-pressed", String(button.dataset.date === date)),
      );
  }

  private async _fetch(spot: string, key: string): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.loading = true;
    this.error = "";
    this._render();
    try {
      const response = await fetch(`/api/v1/outlook?${new URLSearchParams({ spot })}`, {
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error("The seven-day outlook could not be loaded. Try again shortly.");
      const data = (await response.json()) as Outlook;
      if (!this._isCurrent(key, controller)) return;
      this.cache.set(key, data);
      this.data = data;
    } catch (error) {
      if (!this._isCurrent(key, controller)) return;
      this.error = error instanceof Error ? error.message : "Outlook unavailable.";
    } finally {
      if (this._isCurrent(key, controller)) {
        this.loading = false;
        this._render();
      }
    }
  }

  private _render(): void {
    const days = this.data?.days ?? datedDays(this.today);
    const focused =
      element("outlook-days").querySelector<HTMLButtonElement>(":focus")?.dataset.date;
    element("outlook-days").innerHTML = days
      .map((day, index) => outlookCard(day, index, this.activity, this.date, this.loading))
      .join("");
    if (focused)
      element("outlook-days")
        .querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)
        ?.focus({ preventScroll: true });
    element("outlook-days").setAttribute("aria-busy", String(this.loading));
    element("outlook-activities")
      .querySelectorAll<HTMLButtonElement>("[data-outlook-activity]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.outlookActivity === this.activity),
        ),
      );
    this._renderStatus(days);
  }

  private _isCurrent(key: string, controller: AbortController): boolean {
    return !controller.signal.aborted && key === this.key;
  }

  private _renderStatus(days: OutlookDay[]): void {
    const missing = days.filter((day) => day.error).length;
    const partial = missing
      ? `${missing} ${missing === 1 ? "day is" : "days are"} unavailable. Other days are shown.`
      : "";
    const stale = days.some((day) => day.stale)
      ? "Some days use cached data after a provider outage."
      : "";
    element("outlook-status").textContent = this.loading
      ? "Loading seven days…"
      : this.error || [partial, stale].filter(Boolean).join(" ");
    element("outlook-retry").hidden = this.loading || (!this.error && !missing && !stale);
  }
}
