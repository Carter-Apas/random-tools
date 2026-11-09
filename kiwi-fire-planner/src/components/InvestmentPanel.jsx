import { Button, Input, Panel, Progress } from "@random-tools/mono";

import { TargetModeToggle } from "./TargetModeToggle";

import { toNumber } from "../utils/number";
import { formatTargetDate } from "../utils/formatters";

export const InvestmentPanel = ({ values, setters, metrics, formatCurrency }) => {
  const {
    currentSalary,
    kiwiSaverRate,
    studentLoanEnabled,
    portfolio,
    savingsRate,
    fixedMonthlySpend,
    inflationRate,
    annualReturn,
    goalSalary,
    customPortfolioTarget,
  } = values;

  const {
    setCurrentSalary,
    setKiwiSaverRate,
    setStudentLoanEnabled,
    setSavingsMode,
    setPortfolio,
    setSavingsRate,
    setFixedMonthlySpend,
    setInflationRate,
    setAnnualReturn,
    setGoalSalary,
    setCustomPortfolioTarget,
    setTargetMode,
  } = setters;

  const {
    normalizedTargetMode,
    incomeTax,
    accLevy,
    studentLoanRepayment,
    studentLoanRate,
    studentLoanThreshold,
    includeStudentLoan,
    takeHomeAnnual,
    spendableTakeHomeAnnual,
    spendableTakeHomeMonthly,
    kiwiSaverRateApplied,
    employeeKiwiSaverAnnual,
    employeeKiwiSaverMonthly,
    employerKiwiSaverAnnual,
    employerKiwiSaverMonthly,
    normalizedSavingsMode,
    fixedMonthlySpendApplied,
    fixedSpendExceedsAvailable,
    inflationRateApplied,
    yearsToTarget,
    monthsToTarget,
    plannedMonthlyInvestment,
    investableMonthly,
    portfolioProgress,
    selectedPortfolioTarget,
    salaryFireNumber,
    expenseFireNumber,
    fireNumber,
    selectedTargetAt4Percent,
    safeWithdrawal,
  } = metrics;

  return (
    <Panel className="glass-panel mono-rounded p-5 md:p-6">
      <h2 className="title-font mb-4 text-2xl mono-text">Investments and FIRE Goal</h2>
      <div className="space-y-3">
        <TargetModeToggle targetMode={normalizedTargetMode} onChange={setTargetMode} />
        <label className="field-wrap">
          <span>Current Salary (NZD / year)</span>
          <Input
            type="number"
            min="0"
            step="1000"
            value={currentSalary}
            onChange={(event) => setCurrentSalary(toNumber(event.target.value))}
          />
        </label>
        <label className="field-wrap">
          <span>KiwiSaver Contribution (%)</span>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={kiwiSaverRate}
            onChange={(event) => setKiwiSaverRate(toNumber(event.target.value))}
          />
          <p className="text-[0.72rem] mono-muted">
            Deducts {formatCurrency(employeeKiwiSaverMonthly)} per month from your pay and adds a
            matching employer amount to your portfolio ({kiwiSaverRateApplied.toFixed(1)}% each
            side).
          </p>
        </label>
        <label className="field-wrap">
          <span>Student Loan</span>
          <Button
            className={`flex h-11 items-center justify-between mono-rounded-control border px-3 text-sm transition ${
              studentLoanEnabled
                ? "mono-border mono-selected mono-text"
                : "mono-border mono-bg-inset mono-text hover:bg-slate-300/10"
            }`}
            onClick={() => setStudentLoanEnabled((current) => !current)}
            type="button"
          >
            <span>{studentLoanEnabled ? "Included" : "Excluded"}</span>
            <span className="text-xs uppercase tracking-[0.12em]">
              {studentLoanEnabled ? "On" : "Off"}
            </span>
          </Button>
        </label>
        <label className="field-wrap">
          <span>Current Investment Savings (including KiwiSaver)</span>
          <Input
            type="number"
            min="0"
            step="1000"
            value={portfolio}
            onChange={(event) => setPortfolio(toNumber(event.target.value))}
          />
        </label>
        <div>
          <p className="mb-2 text-xs mono-muted">Surplus Strategy</p>
          <div className="grid grid-cols-2 gap-2 mono-rounded-control border mono-border mono-bg-inset p-1">
            <Button
              className={`rounded-lg px-3 py-2 text-sm transition ${
                normalizedSavingsMode === "percent"
                  ? "mono-selected mono-text"
                  : "mono-text hover:bg-slate-300/10"
              }`}
              onClick={() => setSavingsMode("percent")}
              type="button"
            >
              Save %
            </Button>
            <Button
              className={`rounded-lg px-3 py-2 text-sm transition ${
                normalizedSavingsMode === "fixed"
                  ? "mono-selected mono-text"
                  : "mono-text hover:bg-slate-300/10"
              }`}
              onClick={() => setSavingsMode("fixed")}
              type="button"
            >
              Fixed Spend
            </Button>
          </div>
        </div>
        {normalizedSavingsMode === "percent" ? (
          <label className="field-wrap">
            <span>Save % of Investable Surplus</span>
            <Input
              type="number"
              min="0"
              max="100"
              step="1"
              value={savingsRate}
              onChange={(event) => setSavingsRate(toNumber(event.target.value))}
            />
          </label>
        ) : (
          <label className="field-wrap">
            <span>Fixed Monthly Spend from Surplus</span>
            <Input
              type="number"
              min="0"
              step="50"
              value={fixedMonthlySpend}
              onChange={(event) => setFixedMonthlySpend(toNumber(event.target.value))}
            />
            {fixedSpendExceedsAvailable ? (
              <p className="text-[0.72rem] mono-accent-text">
                Requested spend is above available surplus and is capped at{" "}
                {formatCurrency(fixedMonthlySpendApplied)}.
              </p>
            ) : null}
          </label>
        )}
        <label className="field-wrap">
          <span>Expected Annual Return (%)</span>
          <Input
            type="number"
            min="-30"
            max="30"
            step="0.1"
            value={annualReturn}
            onChange={(event) => setAnnualReturn(toNumber(event.target.value))}
          />
        </label>
        <label className="field-wrap">
          <span>Inflation Rate (%)</span>
          <Input
            type="number"
            min="-20"
            max="20"
            step="0.1"
            value={inflationRate}
            onChange={(event) => setInflationRate(toNumber(event.target.value))}
          />
          <p className="text-[0.72rem] mono-muted">Applied: {inflationRateApplied.toFixed(1)}%</p>
        </label>
        {normalizedTargetMode === "fire" ? (
          <label className="field-wrap">
            <span>Goal Salary (Yearly)</span>
            <Input
              type="number"
              min="0"
              step="1000"
              value={goalSalary}
              onChange={(event) => setGoalSalary(toNumber(event.target.value))}
            />
          </label>
        ) : (
          <label className="field-wrap">
            <span>Portfolio Target</span>
            <Input
              type="number"
              min="0"
              step="1000"
              value={customPortfolioTarget}
              onChange={(event) => setCustomPortfolioTarget(toNumber(event.target.value))}
            />
          </label>
        )}
      </div>

      <p className="mt-3 text-xs mono-muted">
        NZ take-home assumes 2025-26 PAYE brackets plus ACC earner levy, and then subtracts employee
        KiwiSaver for spendable income. Student loan uses {studentLoanRate * 100}% above{" "}
        {formatCurrency(studentLoanThreshold)} when enabled.
      </p>

      <div className="mt-5 mono-rounded border mono-border mono-bg-inset p-4">
        <p className="text-xs mono-muted">NZ Salary Breakdown</p>
        <div className="mt-2 grid gap-2 text-sm mono-text sm:grid-cols-2">
          <p>Income tax: {formatCurrency(incomeTax)}</p>
          <p>ACC levy: {formatCurrency(accLevy)}</p>
          <p>After tax + ACC: {formatCurrency(takeHomeAnnual)}</p>
          <p>Employee KiwiSaver: {formatCurrency(employeeKiwiSaverAnnual)}</p>
          <p>Employer KiwiSaver: {formatCurrency(employerKiwiSaverAnnual)}</p>
          <p>Spendable after KiwiSaver: {formatCurrency(spendableTakeHomeAnnual)}</p>
          {includeStudentLoan ? (
            <p>Student loan: {formatCurrency(studentLoanRepayment)}</p>
          ) : (
            <p>Student loan: not included</p>
          )}
        </div>

        <p className="mt-4 text-xs mono-muted">Time Till Target</p>
        <p className="mt-2 text-3xl font-semibold mono-text">
          {yearsToTarget === null ? "Not reachable" : `${yearsToTarget.toFixed(1)} years`}
        </p>
        <p className="mt-1 text-sm mono-text">Projected date: {formatTargetDate(monthsToTarget)}</p>
        <p className="mt-1 text-sm mono-text">
          Monthly contribution used: {formatCurrency(plannedMonthlyInvestment)} (
          {formatCurrency(employeeKiwiSaverMonthly)} employee KiwiSaver +{" "}
          {formatCurrency(employerKiwiSaverMonthly)} employer KiwiSaver + extra surplus investing)
        </p>
        {investableMonthly <= 0 ? (
          <p className="mt-2 text-sm mono-text">
            Expenses currently exceed spendable monthly take-home (
            {formatCurrency(spendableTakeHomeMonthly)}), so no extra surplus is available to invest.
          </p>
        ) : null}

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs mono-muted">
            <span>Progress</span>
            <span>{portfolioProgress.toFixed(1)}%</span>
          </div>
          <Progress value={portfolioProgress} label="Progress to portfolio target" />
          <p className="mt-2 text-sm mono-text">
            Goal portfolio: {formatCurrency(selectedPortfolioTarget)}
          </p>
          {normalizedTargetMode === "fire" ? (
            <>
              <p className="mt-1 text-sm mono-text">
                Salary goal FIRE number (today&apos;s value): {formatCurrency(salaryFireNumber)}
              </p>
              <p className="mt-1 text-sm mono-text">
                Expense FIRE number (today&apos;s value): {formatCurrency(expenseFireNumber)}
              </p>
              <p className="mt-1 text-sm mono-text">
                Current-value FIRE target chosen: {formatCurrency(fireNumber)}
              </p>
              <p className="mt-1 text-sm mono-text">
                4% from current-value target: {formatCurrency(selectedTargetAt4Percent)}
              </p>
              <p className="mt-1 text-sm mono-text">
                Inflation-adjusted FIRE portfolio target: {formatCurrency(selectedPortfolioTarget)}
              </p>
              <p className="mt-1 text-sm mono-text">
                Current 4% withdrawal: {formatCurrency(safeWithdrawal)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm mono-text">
              Target mode: manual portfolio amount (no 4% rule applied)
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
};
