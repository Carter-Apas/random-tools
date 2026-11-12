import { createContext, type ReactNode } from "react";

export const arrayActionsContext = createContext<{ fieldId: string; buttons: ReactNode } | null>(
  null,
);
