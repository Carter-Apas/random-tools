import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { AlertCircle, Check, CheckCircle2, Info, LoaderCircle, X } from "lucide-react";

const descriptionIds = (...ids: (string | undefined)[]) =>
  ids.filter(Boolean).join(" ") || undefined;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
}

export const Button = ({
  variant = "secondary",
  size = "md",
  loading = false,
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) => (
  <button
    {...props}
    type={type}
    className={`mono-button mono-button--${variant} mono-button--${size} ${className}`}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
  >
    {loading && <LoaderCircle size={15} className="mono-spinner" aria-hidden="true" />}
    {children}
  </button>
);

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  suffix?: string;
}

export const Field = ({ label, hint, error, suffix, id, className = "", ...props }: FieldProps) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const description = error ?? hint;
  return (
    <div className={`mono-field ${className}`}>
      <label htmlFor={fieldId}>{label}</label>
      <div className="mono-input-wrap">
        <input
          {...props}
          id={fieldId}
          data-autofocus={props.autoFocus}
          className="mono-input"
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={descriptionIds(
            props["aria-describedby"],
            description ? `${fieldId}-hint` : undefined,
          )}
        />
        {suffix && <span className="mono-input-suffix">{suffix}</span>}
      </div>
      {description && (
        <span id={`${fieldId}-hint`} className={error ? "mono-field-error" : "mono-field-hint"}>
          {error && <AlertCircle size={13} aria-hidden="true" />}
          {description}
        </span>
      )}
    </div>
  );
};

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
}

export const Select = ({ label, hint, id, children, className = "", ...props }: SelectProps) => {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className={`mono-field ${className}`}>
      <label htmlFor={selectId}>{label}</label>
      <select
        {...props}
        id={selectId}
        className="mono-input mono-select"
        aria-describedby={
          [props["aria-describedby"], hint ? `${selectId}-hint` : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
      >
        {children}
      </select>
      {hint && (
        <span id={`${selectId}-hint`} className="mono-field-hint">
          {hint}
        </span>
      )}
    </div>
  );
};

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  description?: string;

  animated?: boolean;
}

export const Checkbox = ({
  label,
  description,
  animated = false,
  className = "",
  onChange,
  ...props
}: CheckboxProps) => {
  const [celebration, setCelebration] = useState({ sequence: 0, active: false });
  return (
    <label
      className={`mono-checkbox ${className}`}
      data-celebrating={(animated && celebration.active) || undefined}
      onAnimationEnd={(event) => {
        if (event.animationName === "mono-check-glow") {
          setCelebration((current) => ({ ...current, active: false }));
        }
      }}
    >
      <input
        {...props}
        type="checkbox"
        onChange={(event) => {
          if (animated) {
            const active =
              event.currentTarget.checked &&
              !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            setCelebration((current) => ({ sequence: current.sequence + 1, active }));
          }
          onChange?.(event);
        }}
      />
      <span key={celebration.sequence} className="mono-checkbox-box" aria-hidden="true">
        <Check size={12} strokeWidth={2.5} />
      </span>
      <span>
        <span className="mono-checkbox-label">{label}</span>
        {description && <span className="mono-checkbox-description">{description}</span>}
      </span>
    </label>
  );
};

export const Switch = ({
  label,
  description,
  className = "",
  ...props
}: Omit<CheckboxProps, "animated">) => (
  <label className={`mono-switch ${className}`}>
    <span>
      <span className="mono-checkbox-label">{label}</span>
      {description && <span className="mono-checkbox-description">{description}</span>}
    </span>
    <input {...props} type="checkbox" role="switch" />
    <span className="mono-switch-track" aria-hidden="true">
      <span />
    </span>
  </label>
);

export const Badge = ({
  children,
  tone = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "accent" | "success" | "danger" }) => (
  <span {...props} className={`mono-badge mono-badge--${tone} ${className}`}>
    {children}
  </span>
);

export const Panel = ({ children, className = "", ...props }: HTMLAttributes<HTMLElement>) => (
  <section {...props} className={`mono-panel ${className}`}>
    {children}
  </section>
);

export const Progress = ({ value, label }: { value: number; label: string }) => {
  const bounded = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div
      className="mono-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={bounded}
    >
      <span style={{ width: `${bounded}%` }} />
    </div>
  );
};

export const Alert = ({
  title,
  children,
  tone = "info",
}: {
  title: string;
  children?: ReactNode;
  tone?: "info" | "success" | "danger" | "warning";
}) => {
  const Icon =
    tone === "success"
      ? CheckCircle2
      : tone === "danger" || tone === "warning"
        ? AlertCircle
        : Info;
  return (
    <div className={`mono-alert mono-alert--${tone}`} role={tone === "danger" ? "alert" : "status"}>
      <Icon size={17} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {children && <p>{children}</p>}
      </div>
    </div>
  );
};

export interface TabItem {
  value: string;
  label: string;
  count?: number;
}

export const Tabs = ({
  items,
  value,
  onChange,
  label,
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div className="mono-tabs" role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button
          key={item.value}
          ref={(element) => {
            refs.current[index] = element;
          }}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          tabIndex={value === item.value ? 0 : -1}
          onClick={() => onChange(item.value)}
          onKeyDown={(event) => {
            let next: number;
            if (event.key === "ArrowRight") next = (index + 1) % items.length;
            else if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = items.length - 1;
            else return;
            event.preventDefault();
            onChange(items[next].value);
            refs.current[next]?.focus();
          }}
        >
          {item.label}
          {item.count !== undefined && <span className="mono-tab-count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
};

export const Dialog = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-autofocus="true"]')?.focus();
    }
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="mono-dialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <header>
        <div>
          <h2 id={titleId}>{title}</h2>
          {description && <p id={descriptionId}>{description}</p>}
        </div>
        <Button aria-label="Close dialog" variant="ghost" onClick={onClose}>
          <X size={17} />
        </Button>
      </header>
      {children && <div className="mono-dialog-body">{children}</div>}
      {footer && <footer>{footer}</footer>}
    </dialog>
  );
};

export const EmptyState = ({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) => (
  <div className="mono-empty">
    {icon && (
      <span className="mono-empty-icon" aria-hidden="true">
        {icon}
      </span>
    )}
    <h3>{title}</h3>
    <p>{description}</p>
    {action}
  </div>
);

export const Skeleton = ({
  width = "100%",
  height = 16,
}: {
  width?: string | number;
  height?: string | number;
}) => <span className="mono-skeleton" style={{ width, height }} aria-hidden="true" />;

export const Stat = ({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) => (
  <div className="mono-stat">
    <span className="mono-muted">{label}</span>
    <strong className="mono-code">{value}</strong>
    {detail && <span className="mono-stat-detail">{detail}</span>}
  </div>
);
