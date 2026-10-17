import { clamp, toNumber } from "./number";
import { calculateNzTakeHome } from "./tax";

function toMonthlyExpense(amount, cadence) {
  const normalizedAmount = toNumber(amount);

  if (normalizedAmount < 0) {
    return -1;
  }

  if (cadence === "weekly") {
    return (normalizedAmount * 52) / 12;
  }

  if (cadence === "yearly") {
    return normalizedAmount / 12;
  }

  return normalizedAmount;
}

function inflationAdjustValue(todayValue, annualInflationPercent, years) {
  return todayValue * Math.pow(1 + annualInflationPercent / 100, years);
}

export function projectMonthsToTarget({
  currentPortfolio,
  monthlyContribution,
  annualReturnPercent,
  targetPortfolio,
}) {
  if (targetPortfolio <= 0 || currentPortfolio >= targetPortfolio) {
    return 0;
  }

  const monthlyRate = annualReturnPercent / 100 / 12;
  let balance = currentPortfolio;

  for (let month = 1; month <= 100 * 12; month += 1) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
    if (balance >= targetPortfolio) {
      return month;
    }
  }

  return Infinity;
}

export function projectMonthsToInflationAdjustedTarget({
  currentPortfolio,
  monthlyContribution,
  annualReturnPercent,
  baseTargetTodayValue,
  annualInflationPercent,
}) {
  if (baseTargetTodayValue <= 0 || currentPortfolio >= baseTargetTodayValue) {
    return 0;
  }

  const monthlyReturnRate = annualReturnPercent / 100 / 12;
  const monthlyInflationFactor = Math.pow(1 + annualInflationPercent / 100, 1 / 12);
  let balance = currentPortfolio;
  let target = baseTargetTodayValue;

  for (let month = 1; month <= 100 * 12; month += 1) {
    balance = balance * (1 + monthlyReturnRate) + monthlyContribution;
    target *= monthlyInflationFactor;

    if (balance >= target) {
      return month;
    }
  }

  return Infinity;
}

export function buildGrowthSeries({
  currentPortfolio,
  monthlyContribution,
  annualReturnPercent,
  monthsToTarget,
}) {
  const fallbackMonths = 30 * 12;
  const maxMonths = 50 * 12;
  const baseMonths = Number.isFinite(monthsToTarget)
    ? Math.max(Math.ceil(monthsToTarget), 12)
    : fallbackMonths;
  const totalMonths = clamp(baseMonths, 12, maxMonths);
  const samplingStep = Math.max(1, Math.ceil(totalMonths / 160));
  const monthlyRate = annualReturnPercent / 100 / 12;

  let balance = Math.max(currentPortfolio, 0);
  const series = [{ month: 0, balance }];

  for (let month = 1; month <= totalMonths; month += 1) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;

    if (month % samplingStep === 0 || month === totalMonths) {
      series.push({ month, balance });
    }
  }

  return {
    growthSeries: series,
    growthProjectionMonths: totalMonths,
    growthSamplingStepMonths: samplingStep,
  };
}

export function calculateDashboardMetrics({
  expenses,
  portfolio,
  annualReturn,
  currentSalary,
  kiwiSaverRate,
  studentLoanEnabled,
  savingsMode,
  savingsRate,
  fixedMonthlySpend,
  inflationRate,
  targetMode,
  customPortfolioTarget,
  goalSalary,
}) {
  const expenseValues = expenses
    .map((item) => toMonthlyExpense(item.amount, item.cadence))
    .filter((value) => value >= 0);

  const totalMonthlyExpense = expenseValues.reduce(
    (total, value) => total + value,
    0,
  );
  const annualExpenses = totalMonthlyExpense * 12;

  const salary = Math.max(toNumber(currentSalary), 0);
  const kiwiSaverRateApplied = clamp(
    toNumber(kiwiSaverRate),
    0,
    100,
  );
  const employeeKiwiSaverAnnual = salary * (kiwiSaverRateApplied / 100);
  const employeeKiwiSaverMonthly = employeeKiwiSaverAnnual / 12;
  const employerKiwiSaverAnnual = employeeKiwiSaverAnnual;
  const employerKiwiSaverMonthly = employerKiwiSaverAnnual / 12;
  const savingsRateApplied = clamp(toNumber(savingsRate), 0, 100);
  const {
    incomeTax,
    accLevy,
    studentLoanRepayment,
    studentLoanRate,
    studentLoanThreshold,
    includeStudentLoan,
    takeHomeAnnual,
    takeHomeMonthly,
  } = calculateNzTakeHome(salary, {
    includeStudentLoan: Boolean(studentLoanEnabled),
  });

  const spendableTakeHomeAnnual = Math.max(
    takeHomeAnnual - employeeKiwiSaverAnnual,
    0,
  );
  const spendableTakeHomeMonthly = spendableTakeHomeAnnual / 12;
  const investableMonthly = Math.max(
    spendableTakeHomeMonthly - totalMonthlyExpense,
    0,
  );
  const normalizedSavingsMode = savingsMode === "fixed" ? "fixed" : "percent";
  const fixedMonthlySpendDesired = Math.max(toNumber(fixedMonthlySpend), 0);
  const fixedMonthlySpendApplied = Math.min(
    fixedMonthlySpendDesired,
    investableMonthly,
  );
  const fixedSpendExceedsAvailable =
    fixedMonthlySpendDesired > investableMonthly;
  const inflationRateApplied = clamp(toNumber(inflationRate), -20, 20);

  const employeeMonthlyInvestment =
    normalizedSavingsMode === "fixed"
      ? Math.max(investableMonthly - fixedMonthlySpendApplied, 0)
      : investableMonthly * (savingsRateApplied / 100);
  const plannedMonthlyInvestment =
    employeeMonthlyInvestment +
    employeeKiwiSaverMonthly +
    employerKiwiSaverMonthly;
  const leftoverAfterInvestmentMonthly =
    normalizedSavingsMode === "fixed"
      ? fixedMonthlySpendApplied
      : Math.max(investableMonthly - employeeMonthlyInvestment, 0);
  const leftoverAfterInvestmentAnnual = leftoverAfterInvestmentMonthly * 12;

  const safeWithdrawal = toNumber(portfolio) * 0.04;
  const salaryFireNumber = toNumber(goalSalary) / 0.04;
  const expenseFireNumber = annualExpenses / 0.04;
  const fireNumber = Math.max(salaryFireNumber, expenseFireNumber);

  const normalizedTargetMode = targetMode === "portfolio" ? "portfolio" : "fire";
  const selectedTargetLabel =
    normalizedTargetMode === "portfolio"
      ? "Custom Portfolio Target"
      : "FIRE Portfolio Target";
  const customTarget = Math.max(toNumber(customPortfolioTarget), 0);
  const currentPortfolio = toNumber(portfolio);
  const annualReturnPercent = toNumber(annualReturn);

  const monthsToTarget =
    normalizedTargetMode === "fire"
      ? projectMonthsToInflationAdjustedTarget({
          currentPortfolio,
          monthlyContribution: plannedMonthlyInvestment,
          annualReturnPercent,
          baseTargetTodayValue: fireNumber,
          annualInflationPercent: inflationRateApplied,
        })
      : projectMonthsToTarget({
          currentPortfolio,
          monthlyContribution: plannedMonthlyInvestment,
          annualReturnPercent,
          targetPortfolio: customTarget,
        });

  const yearsToTarget = Number.isFinite(monthsToTarget)
    ? monthsToTarget / 12
    : null;
  const firePortfolioTarget =
    yearsToTarget === null
      ? fireNumber
      : inflationAdjustValue(fireNumber, inflationRateApplied, yearsToTarget);
  const selectedPortfolioTarget =
    normalizedTargetMode === "fire" ? firePortfolioTarget : customTarget;
  const selectedTargetAt4Percent =
    normalizedTargetMode === "fire"
      ? fireNumber * 0.04
      : selectedPortfolioTarget * 0.04;

  const {
    growthSeries,
    growthProjectionMonths,
    growthSamplingStepMonths,
  } = buildGrowthSeries({
    currentPortfolio,
    monthlyContribution: plannedMonthlyInvestment,
    annualReturnPercent,
    monthsToTarget,
  });
  const inflationDiscountedTarget =
    normalizedTargetMode === "fire"
      ? fireNumber
      : yearsToTarget === null
        ? null
        : selectedPortfolioTarget /
          Math.pow(1 + inflationRateApplied / 100, yearsToTarget);

  const portfolioProgress =
    selectedPortfolioTarget > 0
      ? Math.min((toNumber(portfolio) / selectedPortfolioTarget) * 100, 100)
      : 0;

  return {
    totalMonthlyExpense,
    annualExpenses,
    incomeTax,
    accLevy,
    studentLoanRepayment,
    studentLoanRate,
    studentLoanThreshold,
    includeStudentLoan,
    takeHomeAnnual,
    takeHomeMonthly,
    spendableTakeHomeAnnual,
    spendableTakeHomeMonthly,
    kiwiSaverRateApplied,
    employeeKiwiSaverAnnual,
    employeeKiwiSaverMonthly,
    employerKiwiSaverAnnual,
    employerKiwiSaverMonthly,
    investableMonthly,
    normalizedSavingsMode,
    savingsRateApplied,
    fixedMonthlySpendDesired,
    fixedMonthlySpendApplied,
    fixedSpendExceedsAvailable,
    inflationRateApplied,
    inflationDiscountedTarget,
    plannedMonthlyInvestment,
    leftoverAfterInvestmentMonthly,
    leftoverAfterInvestmentAnnual,
    normalizedTargetMode,
    salaryFireNumber,
    expenseFireNumber,
    fireNumber,
    selectedPortfolioTarget,
    selectedTargetLabel,
    selectedTargetAt4Percent,
    safeWithdrawal,
    monthsToTarget,
    yearsToTarget,
    growthSeries,
    growthProjectionMonths,
    growthSamplingStepMonths,
    portfolioProgress,
  };
}
