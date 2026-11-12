import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@random-tools/mono/styles.css";

import { App } from "./app.tsx";
import "./styles.css";

const root = document.getElementById("root");

if (!root) throw new Error("The application root is missing.");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
