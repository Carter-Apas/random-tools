import { config as loadDotenv } from "dotenv";

export type ServerConfig = {
  openAIApiKey: string;
  openAIModel: string;
  port: number;
  questionDurationMs: number;
  resultDurationMs: number;
  nextRoundDelayMs: number;
  leaderboardDurationMs: number;
};

export function loadEnvFile(
  path = ".env",
  processEnv: NodeJS.ProcessEnv = process.env,
) {
  loadDotenv({
    path,
    processEnv,
    override: false,
  });
}

export function readConfig(env = process.env): ServerConfig {
  return {
    openAIApiKey: env.OPENAI_API_KEY ?? "",
    openAIModel: env.OPENAI_MODEL ?? "gpt-4.1-mini",
    port: Number(env.PORT ?? 3001),
    questionDurationMs: Number(env.QUESTION_DURATION_MS ?? 15000),
    resultDurationMs: Number(env.RESULT_DURATION_MS ?? 4000),
    nextRoundDelayMs: Number(env.NEXT_ROUND_DELAY_MS ?? 2500),
    leaderboardDurationMs: Number(env.LEADERBOARD_DURATION_MS ?? 5000),
  };
}
