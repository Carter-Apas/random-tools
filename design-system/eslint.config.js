import tsx from "@cartercree/eslint-config/configs/tsx.js";

export default [
  { ignores: ["dist/**", "storybook-static/**", "test-results/**", "playwright-report/**"] },
  ...tsx,
  {
    files: ["**/*.stories.tsx", ".storybook/*.tsx"],
    rules: {
      // CSF exports and Story decorator parameters use PascalCase.
      "@typescript-eslint/naming-convention": "off",
    },
  },
  {
    files: ["**/*.stories.tsx", ".storybook/*.ts", ".storybook/*.tsx", "*.config.ts"],
    rules: {
      // Storybook CSF and tool configuration require default exports.
      "import/no-default-export": "off",
    },
  },
  {
    files: ["**/*.stories.tsx", ".storybook/*.tsx", "src/theme.tsx", "src/stories/catalog.tsx"],
    rules: {
      // Story modules export metadata; the theme module also exports its hook.
      "react-refresh/only-export-components": "off",
    },
  },
];
