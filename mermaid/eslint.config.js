import preset from "@cartercree/eslint-config/configs/js.js";

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
  { files: ["server.mjs"], rules: { complexity: ["error", 40] } },
  { files: ["src/main.js"], rules: { complexity: ["error", 30] } },
  { files: ["store.mjs"], rules: { complexity: ["error", 16] } },
];
