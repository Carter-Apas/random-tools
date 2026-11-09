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
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  { files: ["server/legacy-scoring.ts"], rules: { complexity: ["error", 20] } },
  { files: ["server/app.ts"], rules: { complexity: ["error", 20] } },
];
