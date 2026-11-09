import { NativeSelect as MonoSelect } from "@random-tools/mono";
import type { ComponentProps } from "react";

export const NativeSelect = ({
  size: _size,
  ...props
}: Omit<ComponentProps<"select">, "size"> & { size?: "sm" | "default" }) => (
  <MonoSelect {...props} />
);

export const NativeSelectOption = (props: ComponentProps<"option">) => <option {...props} />;

export const NativeSelectOptGroup = (props: ComponentProps<"optgroup">) => <optgroup {...props} />;
