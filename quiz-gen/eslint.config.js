import tsx from "@cartercree/eslint-config/configs/tsx.js";

export default [
  {
    ignores: ["dist/**", "dist-server/**", "node_modules/**"],
  },
  ...tsx.map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  })),
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/naming-convention": "off",
      "comma-dangle": "off",
      complexity: "off",
      "func-style": "off",
      indent: "off",
      "import/order": "off",
      "no-undef": "off",
      "no-unused-vars": "off",
      "prefer-arrow-callback": "off",
      "prefer-arrow/prefer-arrow-functions": "off",
    },
  },
];
