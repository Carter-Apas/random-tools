import { Button } from "@random-tools/mono";

export const TargetModeToggle = ({ targetMode, onChange }) => (
  <div>
    <p className="mb-2 text-xs mono-muted">Portfolio Target Mode</p>
    <div className="grid grid-cols-2 gap-2 mono-rounded-control border mono-border mono-bg-inset p-1">
      <Button
        className={`rounded-lg px-3 py-2 text-sm transition ${
          targetMode === "fire" ? "mono-selected mono-text" : "mono-text hover:bg-slate-300/10"
        }`}
        onClick={() => onChange("fire")}
        type="button"
      >
        FIRE Target
      </Button>
      <Button
        className={`rounded-lg px-3 py-2 text-sm transition ${
          targetMode === "portfolio" ? "mono-selected mono-text" : "mono-text hover:bg-slate-300/10"
        }`}
        onClick={() => onChange("portfolio")}
        type="button"
      >
        Portfolio Target
      </Button>
    </div>
  </div>
);
