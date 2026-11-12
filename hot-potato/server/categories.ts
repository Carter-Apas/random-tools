import { AnswerRegistry } from "./answers/index.js";
import { publishedPacks } from "./answers/catalogue.js";
import { seedCategories } from "./answers/seeds.js";
import type { Category } from "./answers/category-types.js";
import type { Answer } from "./answers/types.js";
import { answerKeys, nameForms } from "./answers/normalize.js";

export { normalize } from "./answers/normalize.js";
export { seedCategories } from "./answers/seeds.js";
export type { Category } from "./answers/category-types.js";

export const categories: Category[] = seedCategories.map((seed) => {
  const pack = publishedPacks.get(seed.id);
  if (!pack) return seed;
  const { name, prompt, hint, vegetable, normalization } = pack.definition;
  return {
    id: seed.id,
    name,
    prompt,
    hint,
    vegetable,
    normalization,
    answers: pack.answers,
    answerPackVersion: pack.version,
  };
});
for (const pack of publishedPacks.values()) {
  if (categories.some((item) => item.id === pack.categoryId)) continue;
  const { id, name, prompt, hint, vegetable, normalization } = pack.definition;
  categories.push({
    id,
    name,
    prompt,
    hint,
    vegetable,
    normalization,
    answers: pack.answers,
    answerPackVersion: pack.version,
  });
}

const indexes = new WeakMap<Category, AnswerRegistry>();
let recognized: Set<string> | undefined;

const knownNames = (): Set<string> => {
  recognized ??= new Set(
    categories.flatMap((category) =>
      category.answers.flatMap((answer) =>
        [answer.label, ...answer.aliases].flatMap((alias) =>
          nameForms(category.id, alias, category.normalization).flatMap((name) =>
            answerKeys(category.id, name, category.normalization),
          ),
        ),
      ),
    ),
  );
  return recognized;
};

export const findAnswer = (category: Category, raw: string): Answer | undefined => {
  let registry = indexes.get(category);
  if (!registry) {
    registry = new AnswerRegistry();
    registry.register({
      id: category.id,
      categoryId: category.id,
      answers: category.answers,
      normalization: category.normalization,
    });
    indexes.set(category, registry);
  }
  return registry.correct(category.id, raw, knownNames());
};
