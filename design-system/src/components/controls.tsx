import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export const Input = ({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={`mono-input ${className}`} />
);

export const NativeSelect = ({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={`mono-input mono-select ${className}`} />
);

export const Textarea = ({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={`mono-input mono-textarea ${className}`} />
);

export const Card = ({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div {...props} data-slot="card" className={`mono-panel mono-card ${className}`} />
);

export const CardHeader = ({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div {...props} data-slot="card-header" className={`mono-card-header ${className}`} />
);

export const CardTitle = ({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div {...props} data-slot="card-title" className={`mono-card-title ${className}`} />
);

export const CardDescription = ({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div {...props} data-slot="card-description" className={`mono-card-description ${className}`} />
);

export const CardAction = ({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div {...props} data-slot="card-action" className={`mono-card-action ${className}`} />
);

export const CardContent = ({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div {...props} data-slot="card-content" className={`mono-card-content ${className}`} />
);

export const CardFooter = ({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div {...props} data-slot="card-footer" className={`mono-card-footer ${className}`} />
);

export const Toggle = ({
  checked,
  onCheckedChange,
  className = "",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) => (
  <button
    {...props}
    type="button"
    role="switch"
    aria-checked={checked}
    className={`mono-toggle ${className}`}
    onClick={() => onCheckedChange(!checked)}
  >
    <span />
  </button>
);
