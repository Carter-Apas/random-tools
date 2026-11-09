import { Button as MonoButton, type ButtonProps as MonoButtonProps } from "@random-tools/mono";

type ButtonProps = Omit<MonoButtonProps, "variant" | "size"> & {
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
};

export const Button = ({ variant = "default", size = "default", ...props }: ButtonProps) => (
  <MonoButton
    {...props}
    variant={
      variant === "default"
        ? "primary"
        : variant === "destructive"
          ? "danger"
          : variant === "ghost" || variant === "link"
            ? "ghost"
            : "secondary"
    }
    size={size === "xs" || size === "sm" ? "sm" : "md"}
  />
);
