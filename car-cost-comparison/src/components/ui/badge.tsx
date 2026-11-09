import { Badge as MonoBadge } from "@random-tools/mono";
import type { HTMLAttributes } from "react";

export const Badge = ({
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost" | "link";
}) => (
  <MonoBadge
    {...props}
    tone={variant === "destructive" ? "danger" : variant === "default" ? "accent" : "neutral"}
  />
);
