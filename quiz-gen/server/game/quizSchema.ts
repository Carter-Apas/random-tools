import { z } from "zod";

const quizQuestionSchema = z.object({
  prompt: z.string().trim().min(1),
  options: z.tuple([
    z.string().trim().min(1),
    z.string().trim().min(1),
    z.string().trim().min(1),
    z.string().trim().min(1),
  ]),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1),
});

export function quizSchema(questionCount: number) {
  return z.object({
    title: z.string().trim().min(1),
    questions: z
      .array(quizQuestionSchema)
      .length(
        questionCount,
        `Quiz must include exactly ${questionCount} questions`,
      ),
  });
}
