const nzdFormatter = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 0,
});

export const formatCurrency = (value) => nzdFormatter.format(value);

export const formatTargetDate = (months) => {
  if (!Number.isFinite(months)) {
    return "Not reachable with current inputs";
  }

  const projected = new Date();
  projected.setMonth(projected.getMonth() + Math.ceil(months));

  return projected.toLocaleDateString("en-NZ", {
    month: "long",
    year: "numeric",
  });
};
