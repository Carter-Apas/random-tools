import type OpenAI from "openai";
import { quizSchema } from "./quizSchema.js";
import type { Quiz } from "./types.js";

type QuizGeneratorInput = {
  topic: string;
  questionCount: number;
};

type QuizGeneratorOptions = {
  model: string;
};

function buildQuizJsonSchema(questionCount: number) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["title", "questions"],
    properties: {
      title: {
        type: "string",
      },
      questions: {
        type: "array",
        minItems: questionCount,
        maxItems: questionCount,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["prompt", "options", "correctIndex", "explanation"],
          properties: {
            prompt: { type: "string" },
            options: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: { type: "string" },
            },
            correctIndex: { type: "integer", minimum: 0, maximum: 3 },
            explanation: { type: "string" },
          },
        },
      },
    },
  };
}

export function createQuizGenerator(
  client: Pick<OpenAI, "responses">,
  options: QuizGeneratorOptions,
) {
  return {
    async generateQuiz(input: QuizGeneratorInput): Promise<Quiz> {
      const response = await client.responses.create({
        model: options.model,
        instructions:
          "You generate fast, lively classroom quiz packs. Return strict JSON only, keep each question clear, factual, and suitable for a game show round.",
        input: `Topic: ${input.topic}\nQuestion count: ${input.questionCount}\nReturn exactly four answer options per question.`,
        text: {
          format: {
            type: "json_schema",
            name: "quiz_payload",
            strict: true,
            schema: buildQuizJsonSchema(input.questionCount),
          },
        },
      });

      const outputText = response.output_text;
      if (!outputText) {
        throw new Error("OpenAI did not return quiz JSON");
      }

      const parsed = JSON.parse(outputText);
      return quizSchema(input.questionCount).parse(parsed);
    },
  };
}
