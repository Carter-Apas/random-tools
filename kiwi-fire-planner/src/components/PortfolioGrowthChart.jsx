import { useState } from "react";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatMonthsAsYears(months) {
  return `${(months / 12).toFixed(1)}y`;
}

function formatTimeFromMonths(months) {
  const roundedMonths = Math.max(Math.round(months), 0);
  const years = Math.floor(roundedMonths / 12);
  const remainingMonths = roundedMonths % 12;

  if (years === 0) {
    return `${remainingMonths}m`;
  }

  if (remainingMonths === 0) {
    return `${years}y`;
  }

  return `${years}y ${remainingMonths}m`;
}

export function PortfolioGrowthChart({
  growthSeries,
  growthProjectionMonths,
  selectedPortfolioTarget,
  inflationRateApplied,
  formatCurrency,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!growthSeries || growthSeries.length < 2) {
    return null;
  }

  const width = 760;
  const height = 290;
  const padding = { top: 20, right: 20, bottom: 38, left: 72 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const first = growthSeries[0];
  const last = growthSeries[growthSeries.length - 1];
  const finalBalance = last.balance;
  const maxBalance = Math.max(
    selectedPortfolioTarget,
    ...growthSeries.map((point) => point.balance),
    1,
  );

  const x = (month) => padding.left + (month / growthProjectionMonths) * plotWidth;
  const y = (balance) =>
    padding.top + (1 - Math.max(balance, 0) / maxBalance) * plotHeight;

  const linePoints = growthSeries
    .map((point) => `${x(point.month)},${y(point.balance)}`)
    .join(" ");

  const areaPath = [
    `M ${x(first.month)} ${padding.top + plotHeight}`,
    ...growthSeries.map((point) => `L ${x(point.month)} ${y(point.balance)}`),
    `L ${x(last.month)} ${padding.top + plotHeight}`,
    "Z",
  ].join(" ");

  const targetLineY = y(selectedPortfolioTarget);
  const xTicks = [0, growthProjectionMonths / 2, growthProjectionMonths];
  const yTicks = [0, maxBalance * 0.5, maxBalance];

  const hoveredPoint =
    hoveredIndex === null ? null : growthSeries[hoveredIndex] ?? null;
  const hoveredTodayValue =
    hoveredPoint === null
      ? null
      : hoveredPoint.balance /
        Math.pow(1 + inflationRateApplied / 100, hoveredPoint.month / 12);
  const hoverX = hoveredPoint ? x(hoveredPoint.month) : null;
  const hoverY = hoveredPoint ? y(hoveredPoint.balance) : null;

  const tooltipWidth = 420;
  const tooltipHeight = 108;
  const tooltipX =
    hoverX === null
      ? 0
      : clamp(
          hoverX + 12,
          padding.left + 4,
          padding.left + plotWidth - tooltipWidth - 4,
        );
  const tooltipY =
    hoverY === null
      ? 0
      : clamp(
          hoverY - tooltipHeight - 12,
          padding.top + 4,
          padding.top + plotHeight - tooltipHeight - 4,
        );

  function updateHover(clientX, rect) {
    const rawX = ((clientX - rect.left) / rect.width) * width;
    const clampedX = clamp(rawX, padding.left, padding.left + plotWidth);
    const monthAtPointer =
      ((clampedX - padding.left) / plotWidth) * growthProjectionMonths;

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < growthSeries.length; index += 1) {
      const distance = Math.abs(growthSeries[index].month - monthAtPointer);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    setHoveredIndex(nearestIndex);
  }

  function handleMouseMove(event) {
    updateHover(event.clientX, event.currentTarget.getBoundingClientRect());
  }

  function handleTouchMove(event) {
    if (!event.touches[0]) {
      return;
    }

    updateHover(event.touches[0].clientX, event.currentTarget.getBoundingClientRect());
  }

  return (
    <div className="rounded-2xl border border-slate-200/15 bg-slate-900/45 p-4">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-300/80">
            Portfolio Growth Projection
          </p>
          <p className="text-sm text-slate-300/85">
            From {formatCurrency(first.balance)} to {formatCurrency(finalBalance)}
          </p>
        </div>
        <p className="text-xs text-slate-300/85">
          Horizon: {formatMonthsAsYears(growthProjectionMonths)}
        </p>
      </div>

      <svg
        className="h-[290px] w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Projected portfolio growth over time"
        onMouseLeave={() => setHoveredIndex(null)}
        onMouseMove={handleMouseMove}
        onTouchEnd={() => setHoveredIndex(null)}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchMove}
      >
        <defs>
          <linearGradient id="growthAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(74, 222, 128, 0.46)" />
            <stop offset="100%" stopColor="rgba(74, 222, 128, 0.02)" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              y1={y(tick)}
              x2={padding.left + plotWidth}
              y2={y(tick)}
              stroke="rgba(226, 232, 240, 0.14)"
              strokeWidth="1"
            />
            <text
              x={padding.left - 8}
              y={y(tick) + 4}
              textAnchor="end"
              fill="rgba(203, 213, 225, 0.9)"
              fontSize="11"
            >
              {formatCurrency(tick)}
            </text>
          </g>
        ))}

        {xTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={x(tick)}
              y1={padding.top}
              x2={x(tick)}
              y2={padding.top + plotHeight}
              stroke="rgba(226, 232, 240, 0.08)"
              strokeWidth="1"
            />
            <text
              x={x(tick)}
              y={padding.top + plotHeight + 20}
              textAnchor="middle"
              fill="rgba(203, 213, 225, 0.9)"
              fontSize="11"
            >
              {tick === 0 ? "Now" : formatMonthsAsYears(tick)}
            </text>
          </g>
        ))}

        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + plotHeight}
          stroke="rgba(226, 232, 240, 0.34)"
          strokeWidth="1.2"
        />
        <line
          x1={padding.left}
          y1={padding.top + plotHeight}
          x2={padding.left + plotWidth}
          y2={padding.top + plotHeight}
          stroke="rgba(226, 232, 240, 0.34)"
          strokeWidth="1.2"
        />

        <path d={areaPath} fill="url(#growthAreaGradient)" />
        <polyline
          fill="none"
          stroke="rgba(52, 211, 153, 0.95)"
          strokeWidth="3"
          points={linePoints}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <line
          x1={padding.left}
          y1={targetLineY}
          x2={padding.left + plotWidth}
          y2={targetLineY}
          stroke="rgba(251, 191, 36, 0.85)"
          strokeWidth="1.5"
          strokeDasharray="6 6"
        />
        <text
          x={padding.left + plotWidth - 6}
          y={Math.max(targetLineY - 6, padding.top + 12)}
          textAnchor="end"
          fill="rgba(251, 191, 36, 0.95)"
          fontSize="12"
        >
          Target {formatCurrency(selectedPortfolioTarget)}
        </text>

        <rect
          x={padding.left}
          y={padding.top}
          width={plotWidth}
          height={plotHeight}
          fill="transparent"
        />

        {hoveredPoint ? (
          <>
            <line
              x1={hoverX}
              y1={padding.top}
              x2={hoverX}
              y2={padding.top + plotHeight}
              stroke="rgba(148, 163, 184, 0.5)"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <line
              x1={padding.left}
              y1={hoverY}
              x2={padding.left + plotWidth}
              y2={hoverY}
              stroke="rgba(148, 163, 184, 0.38)"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <circle
              cx={hoverX}
              cy={hoverY}
              r="5"
              fill="rgba(16, 185, 129, 1)"
              stroke="rgba(240, 253, 250, 0.9)"
              strokeWidth="1.5"
            />

            <g>
              <rect
                x={tooltipX}
                y={tooltipY}
                width={tooltipWidth}
                height={tooltipHeight}
                rx="10"
                fill="rgba(15, 23, 42, 0.92)"
                stroke="rgba(148, 163, 184, 0.48)"
                strokeWidth="1"
              />
              <text
                x={tooltipX + 12}
                y={tooltipY + 30}
                fill="rgba(240, 253, 250, 0.96)"
                fontSize="18"
                fontWeight="700"
              >
                Money: {formatCurrency(hoveredPoint.balance)}
              </text>
              <text
                x={tooltipX + 12}
                y={tooltipY + 58}
                fill="rgba(226, 232, 240, 0.96)"
                fontSize="16"
                fontWeight="600"
              >
                Time: {formatTimeFromMonths(hoveredPoint.month)}
              </text>
              <text
                x={tooltipX + 12}
                y={tooltipY + 86}
                fill="rgba(226, 232, 240, 0.96)"
                fontSize="16"
                fontWeight="600"
              >
                Today&apos;s value: {formatCurrency(hoveredTodayValue)}
              </text>
            </g>
          </>
        ) : (
          <text
            x={padding.left + plotWidth - 4}
            y={padding.top + 14}
            textAnchor="end"
            fill="rgba(203, 213, 225, 0.86)"
            fontSize="11"
          >
            Hover chart for details
          </text>
        )}
      </svg>
    </div>
  );
}
