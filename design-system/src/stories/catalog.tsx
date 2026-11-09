import { useState, type ReactNode } from "react";
import {
  ArrowDown,
  Check,
  ChevronRight,
  Circle,
  Command,
  Copy,
  Download,
  Layers2,
  Moon,
  Plus,
  SlidersHorizontal,
  Sun,
  Terminal,
} from "lucide-react";

import { CostCalculator, ChecklistDemo, PreferencesDemo } from "./demos";

import { Badge, Button, Field, Panel } from "../components/primitives";
import { themes, useTheme } from "../theme";

export {
  CostCalculator,
  ChecklistDemo,
  PreferencesDemo,
  PlannerDemo,
  QuizDemo,
  ToolDirectory,
} from "./demos";

export const Mark = () => (
  <span className="catalog-mark" aria-hidden="true">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M5 19V5l7 8 7-8v14" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  </span>
);
export const ThemePicker = () => {
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-picker" role="group" aria-label="Appearance">
      {themes.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={theme === item}
          aria-label={`Ayu ${item}`}
          title={`Ayu ${item}`}
          onClick={() => setTheme(item)}
        >
          {item === "light" ? (
            <Sun size={14} />
          ) : item === "dark" ? (
            <Moon size={14} />
          ) : (
            <Layers2 size={14} />
          )}
          <span>{item[0].toUpperCase() + item.slice(1)}</span>
        </button>
      ))}
    </div>
  );
};
export const CatalogHeader = () => (
  <header className="catalog-header">
    <a
      href="/?path=/story/start-here-overview--design-language"
      target="_top"
      className="catalog-brand"
    >
      <Mark />
      <strong>
        mono<span>.</span>
      </strong>
      <span className="catalog-brand-note">A shared interface for random tools</span>
    </a>
    <ThemePicker />
  </header>
);
export const Page = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <>
    <CatalogHeader />
    <main className="catalog-page">
      <div className="catalog-page-intro">
        <Badge>Design system / 0.1</Badge>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </main>
    <CatalogFooter />
  </>
);
export const CatalogFooter = () => (
  <footer className="catalog-footer">
    <span>
      <Mark /> Built for the tools you use.
    </span>
    <span className="mono-code">mono / v0.1.0</span>
  </footer>
);
export const Section = ({
  title,
  description,
  children,
  id,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  id?: string;
}) => (
  <section className="catalog-section" id={id}>
    <div className="catalog-section-heading">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
    {children}
  </section>
);
export const Example = ({
  title,
  note,
  children,
  className = "",
}: {
  title: string;
  note?: string;
  children: ReactNode;
  className?: string;
}) => (
  <Panel className={`catalog-example ${className}`}>
    <div className="catalog-example-heading">
      <h3>{title}</h3>
      {note && <span>{note}</span>}
    </div>
    <div className="catalog-example-body">{children}</div>
  </Panel>
);

export const Overview = () => (
  <>
    <CatalogHeader />
    <main className="catalog-overview">
      <section className="catalog-hero">
        <div>
          <div className="catalog-kicker">
            <span /> Random tools, a common thread
          </div>
          <h1>
            One language.
            <br />
            <span>Every tool.</span>
          </h1>
          <p>
            A quiet, precise foundation for things that get things done.
            <br className="desktop-break" /> Familiar components. Considered details. Nothing extra.
          </p>
          <div className="catalog-hero-actions">
            <a className="mono-button mono-button--primary" href="#in-practice">
              Explore the interface <ArrowDown size={14} />
            </a>
            <a
              className="catalog-text-link"
              href="/?path=/story/foundations-design-tokens--palette"
              target="_top"
            >
              View foundations <ChevronRight size={14} />
            </a>
          </div>
        </div>
        <div className="hero-specimen" aria-label="Design principles">
          <div className="hero-specimen-symbol">
            <Mark />
            <span className="mono-code">interface.config</span>
            <Badge tone="accent">v0.1</Badge>
          </div>
          <dl>
            <div>
              <dt>Appearance</dt>
              <dd>Dark / Mirage / Light</dd>
            </div>
            <div>
              <dt>Character</dt>
              <dd>Minimal. Technical. Clear.</dd>
            </div>
            <div>
              <dt>Foundation</dt>
              <dd>Ayu-inspired, purpose-built</dd>
            </div>
            <div>
              <dt>Made for</dt>
              <dd>Everyday tools</dd>
            </div>
          </dl>
          <div className="hero-specimen-bottom">
            <span className="hero-palette">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
            <span>Less noise. More focus.</span>
          </div>
        </div>
      </section>
      <div className="catalog-index">
        <a href="#in-practice">In practice</a>
        <a href="#building-blocks">Building blocks</a>
        <a href="#appearances">Appearances</a>
        <span className="mono-code">React + CSS tokens</span>
      </div>
      <Section
        title="The interface, in practice"
        description="Real interactions, drawn from the tools in this repository."
        id="in-practice"
      >
        <div className="overview-demo-grid">
          <CostCalculator />
          <div className="overview-demo-stack">
            <ChecklistDemo />
            <PreferencesDemo />
          </div>
        </div>
      </Section>
      <Section
        title="Small parts. A consistent whole."
        description="A compact vocabulary for actions, inputs, and feedback."
        id="building-blocks"
      >
        <div className="overview-building-grid">
          <Example title="Actions" note="Clear hierarchy">
            <div className="catalog-row">
              <Button variant="primary">
                <Plus size={14} /> New comparison
              </Button>
              <Button>
                <Download size={14} /> Export
              </Button>
              <Button variant="ghost">Cancel</Button>
            </div>
            <div className="catalog-row">
              <Badge tone="success">
                <Check size={10} /> Saved
              </Badge>
              <Badge tone="accent">In progress</Badge>
              <Badge>Draft</Badge>
              <Badge tone="danger">Needs attention</Badge>
            </div>
          </Example>
          <Example title="Inputs" note="Useful feedback">
            <Field
              label="Annual contribution"
              defaultValue="12000"
              suffix="NZD"
              hint="A little context, right where you need it."
            />
          </Example>
        </div>
      </Section>
      <Section
        title="Three appearances. One system."
        description="Ayu's character, carried through every surface and state."
        id="appearances"
      >
        <ThemeCards />
      </Section>
      <div className="catalog-principles">
        <div>
          <SlidersHorizontal size={18} />
          <h3>Quiet by default</h3>
          <p>Neutral surfaces do the work. Amber points to the next action.</p>
        </div>
        <div>
          <Terminal size={18} />
          <h3>Precision, with warmth</h3>
          <p>Clear type for reading. Monospaced values for comparing.</p>
        </div>
        <div>
          <Command size={18} />
          <h3>Built to be used</h3>
          <p>Keyboard access, visible focus, and feedback you can understand.</p>
        </div>
      </div>
    </main>
    <CatalogFooter />
  </>
);
export const ThemeCards = () => {
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-cards">
      {themes.map((item) => (
        <button
          key={item}
          type="button"
          data-mono-theme={item}
          className={`theme-card ${theme === item ? "is-selected" : ""}`}
          onClick={() => setTheme(item)}
          aria-pressed={theme === item}
          aria-label={`Preview Ayu ${item}`}
        >
          <div className="theme-card-preview">
            <div className="theme-mini-sidebar">
              <span />
              <span />
              <span />
            </div>
            <div className="theme-mini-content">
              <div>
                <span />
                <i />
              </div>
              <strong className="mono-code">
                $1,714<span>.00</span>
              </strong>
              <div className="theme-mini-chart">
                <svg viewBox="0 0 180 40">
                  <path
                    d="M0 37 30 30 60 32 90 18 120 22 150 7 180 2"
                    fill="none"
                    stroke="var(--mono-accent)"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="theme-card-caption">
            <span>
              {item[0].toUpperCase() + item.slice(1)}
              <small>
                {item === "dark"
                  ? "Deep focus"
                  : item === "mirage"
                    ? "Soft contrast"
                    : "Room to breathe"}
              </small>
            </span>
            <span className="theme-card-check">
              {theme === item ? <Check size={13} /> : <Circle size={13} />}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
};

export const CopyToken = ({ token }: { token: string }) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      aria-label={`Copy ${token}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`var(${token})`);
          setCopied(true);
          setError(false);
        } catch {
          setError(true);
        }
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      <span className="mono-code">
        {error ? `Select and copy: var(${token})` : copied ? "Copied" : token}
      </span>
    </Button>
  );
};
