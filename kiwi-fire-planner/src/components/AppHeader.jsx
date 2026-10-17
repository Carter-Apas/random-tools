export function AppHeader() {
  return (
    <header className="glass-panel rounded-3xl p-6 md:p-8">
      <p className="mb-2 text-xs uppercase tracking-[0.35em] text-slate-300/80">
        Financial Independence Planner
      </p>
      <h1 className="title-font text-4xl leading-tight text-amber-100 md:text-5xl">
        FIRE Tracker
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-200/90 md:text-base">
        Add expense entries, calculate NZ take-home pay from your current salary,
        apply KiwiSaver salary deductions and employer matching, and estimate how
        long it will take your investments to hit your FIRE number using the 4%
        rule.
      </p>
    </header>
  );
}
