import { Card as MonoCard } from "@random-tools/mono";
import type { ComponentProps } from "react";

export const Card = ({
  size: _size,
  ...props
}: ComponentProps<typeof MonoCard> & { size?: "default" | "sm" }) => <MonoCard {...props} />;

export {
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@random-tools/mono";
