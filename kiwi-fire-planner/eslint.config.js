import preset from "@cartercree/eslint-config/configs/jsx.js";

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
  { files: ["**/*.{js,jsx}"], languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },
  { files: ["src/App.jsx"], rules: { "import/no-default-export": "off" } },
  { files: ["src/components/InvestmentPanel.jsx"], rules: { complexity: ["error", 15] } },
  { files: ["src/components/PortfolioGrowthChart.jsx"], rules: { complexity: ["error", 12] } },
  { files: ["src/utils/fireCalculations.js"], rules: { complexity: ["error", 15] } },
];
