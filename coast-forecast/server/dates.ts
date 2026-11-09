export const timezone = "Pacific/Auckland";

export const localDate = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);

export const addDays = (date: string, days: number) => {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
};

export const forecastDate = (input = "tomorrow", now = new Date()) => {
  const today = localDate(now);
  if (input === "tomorrow") return addDays(today, 1);
  if (input === "today") return today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input) || !Number.isFinite(Date.parse(`${input}T12:00:00Z`)))
    throw new Error("Use today, tomorrow, or a date in YYYY-MM-DD format.");
  if (addDays(input, 0) !== input || input < today || input > addDays(today, 6))
    throw new Error("Date must be within today and the next six days in Pacific/Auckland.");
  return input;
};

export const timestamp = (local: string, offsetSeconds: number) =>
  new Date(Date.parse(`${local}Z`) - offsetSeconds * 1000).toISOString();

export const localTimestamp = (seconds: number): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(seconds * 1000));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
};
