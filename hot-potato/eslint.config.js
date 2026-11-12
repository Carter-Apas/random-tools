import preset from "@cartercree/eslint-config/configs/tsx.js";

export default [
  { ignores: ["node_modules/**", "dist/**", "art/**", "scripts/**", "test/browser.mjs"] },
  ...preset,
  { files: ["**/*.config.*", "eslint.config.js"], rules: { "import/no-default-export": "off" } },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
