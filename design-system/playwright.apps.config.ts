import { defineConfig } from "@playwright/test";

const servers: { command: string; port: number; env?: Record<string, string> }[] = [
  {
    command: "npm --prefix ../car-cost-comparison run dev -- --host 127.0.0.1 --port 6101",
    port: 6101,
  },
  {
    command: "npm --prefix ../kiwi-fire-planner run dev -- --host 127.0.0.1 --port 6102",
    port: 6102,
  },
  {
    command: "npm --prefix ../quiz-gen start",
    port: 6103,
    env: { PORT: "6103", OPENAI_API_KEY: "mono-ui-test" },
  },
  {
    command: "npm --prefix ../mermaid start",
    port: 6104,
    env: { PORT: "6104", DATA_DIR: "/tmp/random-tools-mono-integration" },
  },
  { command: "npm --prefix ../fishing-checklist run dev", port: 6105, env: { PORT: "6105" } },
  { command: "npm --prefix ../reel-capacity run dev", port: 6106, env: { PORT: "6106" } },
];

export default defineConfig({
  testDir: "./integration",
  workers: 2,
  fullyParallel: true,
  timeout: 45_000,
  reporter: "list",
  use: { viewport: { width: 1440, height: 1000 }, trace: "retain-on-failure" },
  webServer: servers.map(({ command, port, env }) => ({
    command,
    url: `http://127.0.0.1:${port}`,
    env,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  })),
});
