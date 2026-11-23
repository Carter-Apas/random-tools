import { useEffect, useState } from "react";

import type { QuestionView } from "../shared/types";

export const questionPopupMs = 2500;

export const QuestionPopup = ({ question }: { question: QuestionView }) => {
  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setDismissed(question.id), questionPopupMs);
    return () => window.clearTimeout(timer);
  }, [question.id]);

  return (
    <div className="question-popup" data-open={dismissed !== question.id} role="status">
      <div className="question-popup-card panel" key={question.id}>
        <span className="question-popup-kicker">New question</span>
        <span className="question-popup-topic">
          <img src={`/assets/${question.vegetable}.png`} alt="" />
          {question.name}
        </span>
        <strong>{question.prompt}</strong>
      </div>
    </div>
  );
};
