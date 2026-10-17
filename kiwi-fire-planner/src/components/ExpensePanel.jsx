import { PortfolioGrowthChart } from "./PortfolioGrowthChart";

export function ExpensePanel({
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
}) {
  const {
    growthSeries,
    growthProjectionMonths,
    selectedPortfolioTarget,
    inflationRateApplied,
  } = metrics;

  return (
    <section className="glass-panel rounded-3xl p-5 md:p-6">
      <h2 className="title-font mb-4 text-2xl text-amber-100">Expense Inputs</h2>
      <form
        className="grid gap-3 md:grid-cols-[1fr_180px_140px_auto]"
        onSubmit={addExpense}
      >
        <label className="field-wrap">
          <span>Expense Label</span>
          <input
            type="text"
            value={expenseName}
            onChange={(event) => setExpenseName(event.target.value)}
            placeholder="Rent, groceries, transport..."
            required
          />
        </label>
        <label className="field-wrap">
          <span>Amount</span>
          <input
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
          <select
            value={expenseCadence}
            onChange={(event) => setExpenseCadence(event.target.value)}
            className="h-11 rounded-xl border border-slate-300/20 bg-slate-900/35 px-3 text-slate-100 outline-none transition focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/20"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>
        <button className="action-btn mt-6 h-11" type="submit">
          Add
        </button>
      </form>

      <div className="mt-5 max-h-96 overflow-auto rounded-2xl border border-slate-300/15">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-slate-950/70 text-left text-xs uppercase tracking-[0.2em] text-slate-300/80 backdrop-blur">
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
                <td className="px-4 py-5 text-slate-300/80" colSpan={4}>
                  No expenses yet. Add your expense categories to see the
                  monthly-equivalent total.
                </td>
              </tr>
            ) : (
              expenses.map((item) => (
                <tr className="border-t border-slate-300/10" key={item.id}>
                  <td className="px-4 py-3 text-slate-100">{item.name}</td>
                  <td className="px-4 py-3 text-amber-100">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-200/90">
                    {item.cadence === "weekly"
                      ? "Weekly"
                      : item.cadence === "yearly"
                        ? "Yearly"
                        : "Monthly"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="inline-flex rounded-lg border border-rose-200/30 px-3 py-1.5 text-xs text-rose-100 transition hover:bg-rose-400/20"
                      onClick={() => removeExpense(item.id)}
                      type="button"
                    >
                      Remove
                    </button>
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
    </section>
  );
}
