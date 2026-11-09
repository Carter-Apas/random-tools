import type { Preview } from "@storybook/react-vite";
import { useGlobals } from "storybook/preview-api";

import { ThemeProvider, type Theme } from "../src/theme";
import "../src/styles/index.css";
import "../src/stories/catalog.css";

const preview: Preview = {
  initialGlobals: { theme: "mirage" },
  globalTypes: {
    theme: {
      description: "Ayu appearance",
      toolbar: {
        title: "Appearance",
        icon: "paintbrush",
        dynamicTitle: true,
        items: [
          { value: "dark", title: "Ayu Dark" },
          { value: "mirage", title: "Ayu Mirage" },
          { value: "light", title: "Ayu Light" },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const [globals, updateGlobals] = useGlobals();
      return (
        <ThemeProvider
          className={context.viewMode === "docs" ? "mono-docs" : "mono-root"}
          theme={globals.theme as Theme}
          onThemeChange={(theme) => updateGlobals({ theme })}
        >
          <Story />
        </ThemeProvider>
      );
    },
  ],
  parameters: {
    layout: "fullscreen",
    backgrounds: { disable: true },
    controls: { matchers: { color: /(background|color)$/i } },
    options: { storySort: { order: ["Start here", "Foundations", "Components", "Patterns"] } },
    a11y: { test: "error" },
  },
};
export default preview;
