import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

addons.setConfig({
  theme: create({
    base: "dark",
    brandTitle: "mono / random tools",
    brandImage: "/mono.svg",
    brandUrl: "?path=/story/start-here-overview--design-language",
    brandTarget: "_self",
    colorPrimary: "#ffcc66",
    colorSecondary: "#ffcc66",
    appBg: "#1b202b",
    appContentBg: "#1f2430",
    appPreviewBg: "#1f2430",
    appBorderColor: "#343c4b",
    appBorderRadius: 6,
    textColor: "#d9d7ce",
    textInverseColor: "#1f2430",
    barBg: "#1b202b",
    barTextColor: "#a3acbc",
    barSelectedColor: "#ffcc66",
    inputBg: "#242936",
    inputBorder: "#414b5d",
    inputTextColor: "#d9d7ce",
    fontBase: '"Geist Variable", -apple-system, sans-serif',
    fontCode: '"Geist Mono Variable", monospace',
  }),
  sidebar: { showRoots: true },
  layoutCustomisations: {
    showPanel: (state, defaultValue) =>
      state.storyId === "start-here-overview--design-language" ? false : defaultValue,
  },
});
