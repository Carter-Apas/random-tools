export function TargetModeToggle({ targetMode, onChange }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.15em] text-slate-300/86">
        Portfolio Target Mode
      </p>
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-300/15 bg-slate-900/35 p-1">
        <button
          className={`rounded-lg px-3 py-2 text-sm transition ${
            targetMode === "fire"
              ? "bg-amber-300/20 text-amber-100"
              : "text-slate-200 hover:bg-slate-300/10"
          }`}
          onClick={() => onChange("fire")}
          type="button"
        >
          FIRE Target
        </button>
        <button
          className={`rounded-lg px-3 py-2 text-sm transition ${
            targetMode === "portfolio"
              ? "bg-amber-300/20 text-amber-100"
              : "text-slate-200 hover:bg-slate-300/10"
          }`}
          onClick={() => onChange("portfolio")}
          type="button"
        >
          Portfolio Target
        </button>
      </div>
    </div>
  );
}
