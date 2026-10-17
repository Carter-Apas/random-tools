import { describe, expect, it } from "vitest";
import { quizSchema } from "../../server/game/quizSchema";

describe("quizSchema", () => {
  it("accepts a quiz with the requested number of four-option questions", () => {
    const parsed = quizSchema(2).parse({
      title: "Space quiz",
      questions: [
        {
          prompt: "Which planet is known as the Red Planet?",
          options: ["Mars", "Venus", "Earth", "Jupiter"],
          correctIndex: 0,
          explanation: "Mars appears red because of iron oxide.",
        },
        {
          prompt: "How many planets are in the Solar System?",
          options: ["7", "8", "9", "10"],
          correctIndex: 1,
          explanation: "There are eight recognized planets.",
        },
      ],
    });

    expect(parsed.questions).toHaveLength(2);
  });

  it("rejects quizzes that do not match the requested question count", () => {
    expect(() =>
      quizSchema(1).parse({
        title: "Mismatch quiz",
        questions: [
          {
            prompt: "What is H2O?",
            options: ["Water", "Fire", "Air", "Metal"],
            correctIndex: 0,
            explanation: "H2O is water.",
          },
          {
            prompt: "What star do we orbit?",
            options: ["Moon", "Sun", "Mars", "Jupiter"],
            correctIndex: 1,
            explanation: "Earth orbits the Sun.",
          },
        ],
      }),
    ).toThrow(/1/i);
  });
});
