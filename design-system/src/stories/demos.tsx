import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Check,
  FilePlus2,
  Fish,
  Gauge,
  Plus,
  RotateCcw,
  Settings2,
  TrendingUp,
  Zap,
} from "lucide-react";

import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Dialog,
  EmptyState,
  Field,
  Panel,
  Progress,
  Stat,
  Switch,
  Tabs,
} from "../components/primitives";

const nonNegative = (value: string) => Math.max(0, Number(value) || 0);

export const CostCalculator = ({ compact = false }: { compact?: boolean }) => {
  const [vehicle, setVehicle] = useState("electric");
  const [distance, setDistance] = useState("14000");
  const [price, setPrice] = useState("0.28");
  const [dialog, setDialog] = useState(false);
  const [saved, setSaved] = useState(false);
  const annual =
    nonNegative(distance) *
    (vehicle === "electric" ? 0.165 * nonNegative(price) + 0.076 : 0.07 * 2.75);
  const currency = new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  });
  return (
    <Panel className="cost-demo">
      <div className="demo-panel-header">
        <span className="demo-title">
          <Gauge size={16} />
          <strong>Running costs</strong>
        </span>
        <Badge>NZD</Badge>
      </div>
      <div className="demo-panel-content">
        <Tabs
          label="Vehicle type"
          items={[
            { value: "electric", label: "Electric" },
            { value: "petrol", label: "Petrol" },
          ]}
          value={vehicle}
          onChange={setVehicle}
        />
        <div className="demo-form-grid">
          <Field
            label="Annual distance"
            type="number"
            min="0"
            value={distance}
            onChange={(event) => {
              setDistance(event.target.value);
              setSaved(false);
            }}
            suffix="km"
          />
          <Field
            label={vehicle === "electric" ? "Electricity rate" : "Petrol price"}
            type="number"
            min="0"
            step="0.01"
            value={vehicle === "electric" ? price : "2.75"}
            onChange={(event) => {
              setPrice(event.target.value);
              setSaved(false);
            }}
            disabled={vehicle === "petrol"}
            suffix={vehicle === "electric" ? "$/kWh" : "$/L"}
          />
        </div>
        <div className="demo-stat-grid">
          <Stat
            label="Annual running cost"
            value={currency.format(annual)}
            detail="Energy + road user charges"
          />
          <Stat
            label="Cost per kilometre"
            value={`$${(Number(distance) > 0 ? annual / Number(distance) : 0).toFixed(2)}`}
            detail={vehicle === "electric" ? "16.5 kWh / 100 km" : "7.0 L / 100 km"}
          />
        </div>
        {!compact && <CostChart electric={vehicle === "electric"} annual={annual} />}
        <div className="demo-calculator-footer">
          <span className="mono-code">
            {saved ? (
              <>
                <Check size={12} /> Comparison saved
              </>
            ) : (
              "Estimate / annual"
            )}
          </span>
          <Button variant="primary" size="sm" onClick={() => setDialog(true)}>
            Save comparison <Plus size={13} />
          </Button>
        </div>
      </div>
      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        title="Save comparison"
        description="Name this estimate so you can compare it later."
        footer={
          <>
            <Button onClick={() => setDialog(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="save-comparison">
              Save comparison
            </Button>
          </>
        }
      >
        <form
          id="save-comparison"
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(true);
            setDialog(false);
          }}
        >
          <Field
            autoFocus
            label="Comparison name"
            placeholder="Daily commute"
            required
            defaultValue="Daily commute"
          />
        </form>
      </Dialog>
    </Panel>
  );
};

const CostChart = ({ electric, annual }: { electric: boolean; annual: number }) => {
  const id = `chart-${electric ? "ev" : "petrol"}`;
  return (
    <div className="cost-chart">
      <div className="cost-chart-legend">
        <span>
          <i />
          {electric ? "Electric" : "Petrol"}
        </span>
        <span>
          <i />
          Comparison
        </span>
        <span className="mono-code">5-year projection</span>
      </div>
      <svg viewBox="0 0 500 100" role="img" aria-labelledby={id} preserveAspectRatio="none">
        <title id={id}>
          Five-year cumulative cost projection. Selected vehicle: {Math.round(annual * 5)} NZD.
        </title>
        {[15, 45, 75].map((y) => (
          <path key={y} d={`M0 ${y}H500`} className="chart-grid" />
        ))}
        <path d="M0 88 100 72 200 56 300 40 400 24 500 8" className="chart-comparison" />
        <path
          d={`M0 88 100 ${electric ? 80 : 71} 200 ${electric ? 72 : 54} 300 ${electric ? 64 : 37} 400 ${electric ? 56 : 20} 500 ${electric ? 48 : 3}`}
          className="chart-primary"
        />
      </svg>
      <div className="chart-axis mono-code">
        <span>Year 1</span>
        <span>Year 2</span>
        <span>Year 3</span>
        <span>Year 4</span>
        <span>Year 5</span>
      </div>
      <p className="chart-note">Illustrative trend; annual estimate shown above.</p>
    </div>
  );
};

const initialGear = [
  { label: "Rod & reel", checked: true },
  { label: "Tackle box", checked: true },
  { label: "Life jacket", checked: false },
  { label: "Fishing licence", checked: false },
];

export const ChecklistDemo = () => {
  const [items, setItems] = useState(initialGear);
  const checked = items.filter((item) => item.checked).length;
  return (
    <Panel>
      <div className="demo-panel-header">
        <span className="demo-title">
          <Fish size={16} />
          <strong>Ready for the water</strong>
        </span>
        <span className="mono-code demo-fraction" aria-live="polite">
          {checked}/{items.length}
        </span>
      </div>
      <div className="demo-panel-content">
        <Progress value={(checked / items.length) * 100} label="Gear packed" />
        <div className="demo-checklist">
          {items.map((item, index) => (
            <Checkbox
              key={item.label}
              label={item.label}
              checked={item.checked}
              onChange={() =>
                setItems(
                  items.map((current, i) =>
                    i === index ? { ...current, checked: !current.checked } : current,
                  ),
                )
              }
            />
          ))}
        </div>
        <div className="demo-checklist-footer">
          <span>
            {checked === items.length
              ? "Everything packed. Good to go."
              : `${items.length - checked} items left to pack`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Reset packing checklist"
            onClick={() => setItems(initialGear.map((item) => ({ ...item, checked: false })))}
          >
            <RotateCcw size={12} /> Reset
          </Button>
        </div>
      </div>
    </Panel>
  );
};

export const PreferencesDemo = () => {
  const [remember, setRemember] = useState(true);
  const [sound, setSound] = useState(false);
  return (
    <Panel>
      <div className="demo-panel-header">
        <span className="demo-title">
          <Settings2 size={16} />
          <strong>Make it yours</strong>
        </span>
        <Badge>Preferences</Badge>
      </div>
      <div className="demo-panel-content demo-preferences">
        <Switch
          label="Remember inputs"
          description="Keep values between visits"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
        />
        <Switch
          label="Sound effects"
          description="A little feedback when you finish"
          checked={sound}
          onChange={(event) => setSound(event.target.checked)}
        />
      </div>
    </Panel>
  );
};

export const PlannerDemo = () => {
  const [monthly, setMonthly] = useState("1800");
  const annual = Math.max(0, Number(monthly) || 0) * 12;
  return (
    <Panel>
      <div className="demo-panel-header">
        <span className="demo-title">
          <TrendingUp size={17} />
          <strong>Kiwi FIRE planner</strong>
        </span>
        <Badge tone="accent">Projection</Badge>
      </div>
      <div className="demo-panel-content">
        <div className="demo-stat-grid">
          <Stat label="Portfolio" value="$284,650" detail="Across all investments" />
          <Stat
            label="Annual contribution"
            value={new Intl.NumberFormat("en-NZ", {
              style: "currency",
              currency: "NZD",
              maximumFractionDigits: 0,
            }).format(annual)}
            detail="Based on your monthly target"
          />
        </div>
        <Field
          label="Monthly contribution"
          value={monthly}
          type="number"
          min="0"
          suffix="NZD"
          onChange={(event) => setMonthly(event.target.value)}
        />
        <div className="demo-target">
          <span>Progress to $1,000,000</span>
          <span className="mono-code">28.5%</span>
        </div>
        <Progress value={28.5} label="Progress to financial independence" />
      </div>
    </Panel>
  );
};

export const QuizDemo = () => {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <Panel>
      <div className="demo-panel-header">
        <span className="demo-title">
          <Zap size={16} />
          <strong>Quiz night</strong>
        </span>
        <Badge>Question 3 / 10</Badge>
      </div>
      <div className="demo-panel-content">
        <h3 className="quiz-question">Which element has the chemical symbol W?</h3>
        <div className="quiz-options">
          {["Tungsten", "Tin", "Titanium", "Tellurium"].map((option, index) => (
            <button
              key={option}
              type="button"
              className={selected === option ? "selected" : ""}
              disabled={selected !== null}
              onClick={() => setSelected(option)}
            >
              <span className="mono-code">{String.fromCharCode(65 + index)}</span>
              {option}
              {selected === option && <Check size={14} />}
            </button>
          ))}
        </div>
        {selected && (
          <div className="quiz-result">
            <Alert
              title={
                selected === "Tungsten" ? "Correct. W is tungsten." : "The answer is tungsten."
              }
              tone={selected === "Tungsten" ? "success" : "info"}
            />
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
};

export const ToolDirectory = () => {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const tools = [
    {
      name: "Car cost comparison",
      description: "Understand the cost of getting around.",
      category: "Calculators",
      Icon: Gauge,
    },
    {
      name: "Kiwi FIRE planner",
      description: "Plan for financial independence.",
      category: "Calculators",
      Icon: TrendingUp,
    },
    {
      name: "Fishing checklist",
      description: "Everything you need for the water.",
      category: "Checklists",
      Icon: Fish,
    },
    {
      name: "Quiz generator",
      description: "A good question starts a great night.",
      category: "Games",
      Icon: Zap,
    },
  ];
  const filtered = tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "all" || tool.category.toLowerCase() === filter),
  );
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  return (
    <div className="directory-demo">
      <div className="directory-heading">
        <div>
          <h2>Your tools</h2>
          <p>A few useful things, all in one place.</p>
        </div>
        <Badge>
          <Activity size={10} /> {tools.length} tools
        </Badge>
      </div>
      <Field
        label="Find a tool"
        placeholder="Search by name…"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <Tabs
        label="Tool category"
        items={[
          { value: "all", label: "All tools", count: 4 },
          { value: "calculators", label: "Calculators", count: 2 },
          { value: "checklists", label: "Checklists" },
          { value: "games", label: "Games" },
        ]}
        value={filter}
        onChange={setFilter}
      />
      <div className="directory-list">
        {filtered.map(({ name, description, category, Icon }) => (
          <button key={name} type="button" onClick={() => setSelectedTool(name)}>
            <span className="directory-icon">
              <Icon size={19} />
            </span>
            <span>
              <strong>{name}</strong>
              <small>{description}</small>
            </span>
            <Badge>{category}</Badge>
            <ArrowUpRight size={16} />
          </button>
        ))}
      </div>
      {!filtered.length && (
        <EmptyState
          icon={<FilePlus2 size={20} />}
          title="No tools found"
          description="Try a different name or choose another category."
          action={
            <Button
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}
      <Dialog
        title={selectedTool ?? ""}
        open={selectedTool !== null}
        onClose={() => setSelectedTool(null)}
        description="An interface preview using the shared design system."
        footer={<Button onClick={() => setSelectedTool(null)}>Close preview</Button>}
      >
        {selectedTool === "Car cost comparison" ? (
          <CostCalculator compact />
        ) : selectedTool === "Kiwi FIRE planner" ? (
          <PlannerDemo />
        ) : selectedTool === "Fishing checklist" ? (
          <ChecklistDemo />
        ) : (
          <QuizDemo />
        )}
      </Dialog>
    </div>
  );
};
