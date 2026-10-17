import { useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { ExpensePanel } from "./components/ExpensePanel";
import { InvestmentPanel } from "./components/InvestmentPanel";
import { SummaryStats } from "./components/SummaryStats";
import { STORAGE_KEYS } from "./constants/storageKeys";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { formatCurrency } from "./utils/formatters";
import { calculateDashboardMetrics } from "./utils/fireCalculations";
import { toNumber } from "./utils/number";

function App() {
  const [expenses, setExpenses] = useLocalStorage(STORAGE_KEYS.expenses, []);
  const [portfolio, setPortfolio] = useLocalStorage(STORAGE_KEYS.portfolio, 100000);
  const [annualReturn, setAnnualReturn] = useLocalStorage(
    STORAGE_KEYS.annualReturn,
    7,
  );
  const [currentSalary, setCurrentSalary] = useLocalStorage(
    STORAGE_KEYS.currentSalary,
    100000,
  );
  const [kiwiSaverRate, setKiwiSaverRate] = useLocalStorage(
    STORAGE_KEYS.kiwiSaverRate,
    3,
  );
  const [studentLoanEnabled, setStudentLoanEnabled] = useLocalStorage(
    STORAGE_KEYS.studentLoanEnabled,
    false,
  );
  const [savingsMode, setSavingsMode] = useLocalStorage(
    STORAGE_KEYS.savingsMode,
    "percent",
  );
  const [savingsRate, setSavingsRate] = useLocalStorage(
    STORAGE_KEYS.savingsRate,
    50,
  );
  const [fixedMonthlySpend, setFixedMonthlySpend] = useLocalStorage(
    STORAGE_KEYS.fixedMonthlySpend,
    1000,
  );
  const [inflationRate, setInflationRate] = useLocalStorage(
    STORAGE_KEYS.inflationRate,
    2.5,
  );
  const [targetMode, setTargetMode] = useLocalStorage(
    STORAGE_KEYS.targetMode,
    "fire",
  );
  const [customPortfolioTarget, setCustomPortfolioTarget] = useLocalStorage(
    STORAGE_KEYS.customPortfolioTarget,
    1500000,
  );
  const [goalSalary, setGoalSalary] = useLocalStorage(
    STORAGE_KEYS.goalSalary,
    70000,
  );

  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCadence, setExpenseCadence] = useState("monthly");

  const metrics = useMemo(
    () =>
      calculateDashboardMetrics({
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
      }),
    [
      annualReturn,
      customPortfolioTarget,
      currentSalary,
      kiwiSaverRate,
      expenses,
      fixedMonthlySpend,
      goalSalary,
      inflationRate,
      portfolio,
      savingsMode,
      savingsRate,
      studentLoanEnabled,
      targetMode,
    ],
  );

  function addExpense(event) {
    event.preventDefault();
    const normalizedAmount = toNumber(expenseAmount, -1);
    const trimmedName = expenseName.trim();

    if (!trimmedName || normalizedAmount < 0) {
      return;
    }

    setExpenses((current) => [
      {
        id: crypto.randomUUID(),
        name: trimmedName,
        amount: normalizedAmount,
        cadence:
          expenseCadence === "weekly" || expenseCadence === "yearly"
            ? expenseCadence
            : "monthly",
      },
      ...current,
    ]);

    setExpenseName("");
    setExpenseAmount("");
    setExpenseCadence("monthly");
  }

  function removeExpense(id) {
    setExpenses((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(177,212,224,0.22)_0%,rgba(177,212,224,0)_45%),radial-gradient(circle_at_80%_0%,rgba(225,176,122,0.18)_0%,rgba(225,176,122,0)_38%),var(--bg-canvas)] px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <AppHeader />
        <SummaryStats
          metrics={metrics}
          expensesCount={expenses.length}
          formatCurrency={formatCurrency}
        />

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <ExpensePanel
            expenseName={expenseName}
            setExpenseName={setExpenseName}
            expenseAmount={expenseAmount}
            setExpenseAmount={setExpenseAmount}
            expenseCadence={expenseCadence}
            setExpenseCadence={setExpenseCadence}
            addExpense={addExpense}
            expenses={expenses}
            removeExpense={removeExpense}
            formatCurrency={formatCurrency}
            metrics={metrics}
          />
          <InvestmentPanel
            values={{
              currentSalary,
              kiwiSaverRate,
              studentLoanEnabled,
              savingsMode,
              portfolio,
              savingsRate,
              fixedMonthlySpend,
              inflationRate,
              annualReturn,
              goalSalary,
              customPortfolioTarget,
            }}
            setters={{
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
            }}
            metrics={metrics}
            formatCurrency={formatCurrency}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
