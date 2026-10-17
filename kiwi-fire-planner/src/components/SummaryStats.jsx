import { StatCard } from "./StatCard";

export function SummaryStats({ metrics, expensesCount, formatCurrency }) {
  const {
    totalMonthlyExpense,
    annualExpenses,
    takeHomeMonthly,
    spendableTakeHomeMonthly,
    spendableTakeHomeAnnual,
    includeStudentLoan,
    employeeKiwiSaverMonthly,
    employerKiwiSaverMonthly,
    plannedMonthlyInvestment,
    investableMonthly,
    normalizedSavingsMode,
    savingsRateApplied,
    fixedMonthlySpendApplied,
    fixedSpendExceedsAvailable,
    inflationRateApplied,
    inflationDiscountedTarget,
    leftoverAfterInvestmentMonthly,
    leftoverAfterInvestmentAnnual,
    selectedTargetLabel,
    selectedPortfolioTarget,
    selectedTargetAt4Percent,
    normalizedTargetMode,
    yearsToTarget,
  } = metrics;

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <StatCard
        title="Monthly Spendable Pay"
        value={formatCurrency(spendableTakeHomeMonthly)}
        subtitle={`${formatCurrency(spendableTakeHomeAnnual)} yearly after PAYE + ACC levy${includeStudentLoan ? " + student loan" : ""}; gross take-home before KiwiSaver is ${formatCurrency(takeHomeMonthly)}/mo`}
      />
      <StatCard
        title="Total Monthly Expenses"
        value={formatCurrency(totalMonthlyExpense)}
        subtitle={`${formatCurrency(annualExpenses)} yearly from ${expensesCount} entries`}
      />
      <StatCard
        title="Planned Monthly Investment"
        value={formatCurrency(plannedMonthlyInvestment)}
        subtitle={
          normalizedSavingsMode === "fixed"
            ? `${formatCurrency(fixedMonthlySpendApplied)} fixed spend from ${formatCurrency(investableMonthly)} available${fixedSpendExceedsAvailable ? " (capped)" : ""}; KiwiSaver adds ${formatCurrency(employeeKiwiSaverMonthly + employerKiwiSaverMonthly)}/mo`
            : `${formatCurrency(investableMonthly)} available, saving ${savingsRateApplied}%; KiwiSaver adds ${formatCurrency(employeeKiwiSaverMonthly + employerKiwiSaverMonthly)}/mo`
        }
      />
      <StatCard
        title="Left Over After Investing ( Spending money )"
        value={formatCurrency(leftoverAfterInvestmentMonthly)}
        subtitle={`${formatCurrency(leftoverAfterInvestmentAnnual)} per year`}
      />
      <article className="stat-panel">
        <p>{selectedTargetLabel}</p>
        <strong>{formatCurrency(selectedPortfolioTarget)}</strong>
        {normalizedTargetMode === "fire" ? (
          <span>
            4% target income (today&apos;s value):{" "}
            {formatCurrency(selectedTargetAt4Percent)}
          </span>
        ) : (
          <span>Manual portfolio milestone</span>
        )}
      </article>
      <StatCard
        title="Current-Value Target"
        value={
          inflationDiscountedTarget === null
            ? "Not reachable"
            : formatCurrency(inflationDiscountedTarget)
        }
        subtitle={
          normalizedTargetMode === "fire"
            ? "Base FIRE target used for the 4% rule (today's dollars)"
            : yearsToTarget === null
              ? "Needs a reachable timeline first"
              : `Today's value of target over ${yearsToTarget.toFixed(1)} years at ${inflationRateApplied.toFixed(1)}%`
        }
      />
    </section>
  );
}
