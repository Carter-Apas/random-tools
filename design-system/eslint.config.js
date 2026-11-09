import tsx from "@cartercree/eslint-config/configs/tsx.js";

export default [
  { ignores: ["dist/**", "storybook-static/**", "test-results/**", "playwright-report/**"] },
  ...tsx,
  {
    files: ["**/*.stories.tsx", ".storybook/*.tsx"],
    rules: {
      "@typescript-eslint/naming-convention": "off",
    },
  },
  {
    files: ["**/*.stories.tsx", ".storybook/*.ts", ".storybook/*.tsx", "*.config.ts"],
    rules: {
      "import/no-default-export": "off",
    },
  },
  {
    files: ["**/*.stories.tsx", ".storybook/*.tsx", "src/theme.tsx", "src/stories/catalog.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
];
