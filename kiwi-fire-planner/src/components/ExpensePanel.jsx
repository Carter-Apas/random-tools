import { Button, Input, NativeSelect, Panel } from "@random-tools/mono";

import { PortfolioGrowthChart } from "./PortfolioGrowthChart";

export const ExpensePanel = ({
  expenseName,
  setExpenseName,
  expenseAmount,
  setExpenseAmount,
  expenseCadence,
  setExpenseCadence,
  addExpense,
  expenses,
  removeExpense,
  formatCurrency,
  metrics,
}) => {
  const { growthSeries, growthProjectionMonths, selectedPortfolioTarget, inflationRateApplied } =
    metrics;

  return (
    <Panel className="glass-panel mono-rounded p-5 md:p-6">
      <h2 className="title-font mb-4 text-2xl mono-text">Expense Inputs</h2>
      <form className="grid gap-3 md:grid-cols-[1fr_180px_140px_auto]" onSubmit={addExpense}>
        <label className="field-wrap">
          <span>Expense Label</span>
          <Input
            type="text"
            value={expenseName}
            onChange={(event) => setExpenseName(event.target.value)}
            placeholder="Rent, groceries, transport..."
            required
          />
        </label>
        <label className="field-wrap">
          <span>Amount</span>
          <Input
            type="number"
            min="0"
            step="1"
            value={expenseAmount}
            onChange={(event) => setExpenseAmount(event.target.value)}
            placeholder="0"
            required
          />
        </label>
        <label className="field-wrap">
          <span>Tracking</span>
          <NativeSelect
            value={expenseCadence}
            onChange={(event) => setExpenseCadence(event.target.value)}
            className="h-11 mono-rounded-control border mono-border mono-bg-inset px-3 mono-text outline-none transition focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/20"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </NativeSelect>
        </label>
        <Button variant="primary" className="action-btn mt-6 h-11" type="submit">
          Add
        </Button>
      </form>

      <div className="mt-5 max-h-96 overflow-auto mono-rounded border mono-border">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 mono-bg-inset text-left text-xs mono-muted backdrop-blur">
            <tr>
              <th className="px-4 py-3">Expense</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Tracking</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td className="px-4 py-5 mono-muted" colSpan={4}>
                  No expenses yet. Add your expense categories to see the monthly-equivalent total.
                </td>
              </tr>
            ) : (
              expenses.map((item) => (
                <tr className="border-t mono-border" key={item.id}>
                  <td className="px-4 py-3 mono-text">{item.name}</td>
                  <td className="px-4 py-3 mono-text">{formatCurrency(item.amount)}</td>
                  <td className="px-4 py-3 mono-text">
                    {item.cadence === "weekly"
                      ? "Weekly"
                      : item.cadence === "yearly"
                        ? "Yearly"
                        : "Monthly"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      className="inline-flex rounded-lg border mono-border px-3 py-1.5 text-xs mono-danger-text transition hover:bg-rose-400/20"
                      onClick={() => removeExpense(item.id)}
                      type="button"
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5">
        <PortfolioGrowthChart
          growthSeries={growthSeries}
          growthProjectionMonths={growthProjectionMonths}
          selectedPortfolioTarget={selectedPortfolioTarget}
          inflationRateApplied={inflationRateApplied}
          formatCurrency={formatCurrency}
        />
      </div>
    </Panel>
  );
};
