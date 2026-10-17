import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadEnvFile, readConfig } from "../../server/config";

const tempFiles: string[] = [];

afterEach(() => {
  tempFiles.forEach((file) => {
    fs.rmSync(file, { force: true });
  });
  tempFiles.length = 0;
});

describe("config", () => {
  it("loads OPENAI_API_KEY, model values, and round timing values from a dotenv file", () => {
    const envPath = path.join(os.tmpdir(), `quiz-forge-${Date.now()}.env`);
    fs.writeFileSync(
      envPath,
      "OPENAI_API_KEY=test_key_123\nOPENAI_MODEL=gpt-4.1\nPORT=4444\nQUESTION_DURATION_MS=12345\nNEXT_ROUND_DELAY_MS=2345\n",
    );
    tempFiles.push(envPath);

    const env: NodeJS.ProcessEnv = {};
    loadEnvFile(envPath, env);
    const config = readConfig(env);

    expect(config.openAIApiKey).toBe("test_key_123");
    expect(config.openAIModel).toBe("gpt-4.1");
    expect(config.port).toBe(4444);
    expect(config.questionDurationMs).toBe(12345);
    expect(config.nextRoundDelayMs).toBe(2345);
  });

  it("uses the default next round delay when NEXT_ROUND_DELAY_MS is missing", () => {
    const config = readConfig({});

    expect(config.nextRoundDelayMs).toBe(2500);
  });
});
