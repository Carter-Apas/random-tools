import { createRoot } from "react-dom/client";

import "@fontsource/pixelify-sans/latin-700.css";
import "@fontsource/chakra-petch/latin-400.css";
import "@fontsource/chakra-petch/latin-600.css";
import "@fontsource/chakra-petch/latin-700.css";
import "@fontsource/nunito/latin-400.css";
import "@fontsource/nunito/latin-600.css";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-800.css";
import { App } from "./App";
import "./styles.css";
import "./play.css";
createRoot(document.getElementById("root")!).render(<App />);
