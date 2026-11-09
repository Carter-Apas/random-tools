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
  { files: ["server/game/lobbyStore.ts"], rules: { complexity: ["error", 20] } },
  { files: ["src/features/host/HostScreen.tsx"], rules: { complexity: ["error", 40] } },
  { files: ["src/features/player/PlayerScreen.tsx"], rules: { complexity: ["error", 85] } },
];
