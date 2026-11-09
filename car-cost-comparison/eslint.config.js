import preset from "@cartercree/eslint-config/configs/tsx.js";

export default [
  {
    ignores: [
      "node_modules/**",
      "vendor/**",
      "dist/**",
      "dist-server/**",
      "coverage/**",
      "public/mono.*",
      ".data/**",
      ".cache/**",
    ],
  },
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
