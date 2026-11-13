import { AnswerRegistry } from "./answers/index.js";
import { publishedPacks } from "./answers/catalogue.js";
import type { Question } from "./answers/question-types.js";
import type { Answer } from "./answers/types.js";
import { answerKeys, nameForms } from "./answers/normalize.js";

export { normalize } from "./answers/normalize.js";
export type { Question } from "./answers/question-types.js";

export const questions: Question[] = [...publishedPacks.values()].map((pack) => {
  const { id, datasetId, name, prompt, hint, vegetable, normalization } = pack.definition;
  return {
    id,
    datasetId,
    name,
    prompt,
    hint,
    vegetable,
    normalization,
    answers: pack.answers,
    answerPackVersion: pack.version,
  };
});

const indexes = new WeakMap<Question["answers"], Map<string, AnswerRegistry>>();
let recognized: Set<string> | undefined;

const knownNames = (): Set<string> => {
  recognized ??= new Set(
    questions.flatMap((question) =>
      question.answers.flatMap((answer) =>
        [answer.label, ...answer.aliases].flatMap((alias) =>
          nameForms(question.id, alias, question.normalization).flatMap((name) =>
            answerKeys(question.id, name, question.normalization),
          ),
        ),
      ),
    ),
  );
  return recognized;
};

export const findAnswer = (question: Question, raw: string): Answer | undefined => {
  const byQuestion = indexes.get(question.answers) ?? new Map<string, AnswerRegistry>();
  indexes.set(question.answers, byQuestion);
  let registry = byQuestion.get(question.id);
  if (!registry) {
    registry = new AnswerRegistry();
    registry.register({
      id: question.id,
      questionId: question.id,
      answers: question.answers,
      normalization: question.normalization,
    });
    byQuestion.set(question.id, registry);
  }
  const exact = registry.find(question.id, raw);
  if (exact) return exact;
  return registry.correct(question.id, raw, knownNames());
};

knownNames();
