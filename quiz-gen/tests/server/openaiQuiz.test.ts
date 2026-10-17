import { describe, expect, it, vi } from "vitest";
import { createQuizGenerator } from "../../server/game/openaiQuiz";

describe("createQuizGenerator", () => {
  it("parses validated quiz JSON from the OpenAI response", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({
        title: "Ocean quiz",
        questions: [
          {
            prompt: "Largest ocean?",
            options: ["Atlantic", "Indian", "Pacific", "Arctic"],
            correctIndex: 2,
            explanation: "The Pacific is the largest ocean.",
          },
        ],
      }),
    });

    const generator = createQuizGenerator({ responses: { create } } as never, {
      model: "gpt-4.1-mini",
    });
    const quiz = await generator.generateQuiz({
      topic: "Oceans",
      questionCount: 1,
    });

    expect(quiz.title).toBe("Ocean quiz");
    expect(create).toHaveBeenCalledOnce();
  });

  it("throws when the model output does not match the requested schema", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({
        title: "Broken quiz",
        questions: [],
      }),
    });

    const generator = createQuizGenerator({ responses: { create } } as never, {
      model: "gpt-4.1-mini",
    });

    await expect(
      generator.generateQuiz({ topic: "Oceans", questionCount: 1 }),
    ).rejects.toThrow(/exactly 1 questions/i);
  });
});
