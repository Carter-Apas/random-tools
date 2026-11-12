import preset from "@cartercree/eslint-config/configs/tsx.js";

export default [
  {
    ignores: ["node_modules/**", "vendor/**", "dist/**", "test-results/**", "playwright-report/**"],
  },
  ...preset,
  { files: ["**/*.config.*", "eslint.config.js"], rules: { "import/no-default-export": "off" } },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
