import { CheckCircle2 } from 'lucide-react';
import type { Question } from './types';
import { QUESTION_KEY_PREFIX } from './constants';

interface CompletedAnswersUIProps {
  questions: Question[];
  answers: Record<string, string>;
}

export function CompletedAnswersUI({ questions, answers }: CompletedAnswersUIProps) {
  return (
    <div className="flex flex-col gap-1 py-0.5">
      <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] mb-0.5">
        <CheckCircle2 className="size-3 shrink-0" style={{ color: 'var(--success)' }} />
        <span>Answered</span>
      </div>
      <div className="flex flex-col gap-0.5 pl-4">
        {questions.map((question, idx) => {
          const answer = answers[`${QUESTION_KEY_PREFIX}${idx}`];
          return (
            <div key={idx} className="flex items-baseline gap-1.5 text-sm">
              <span className="text-xs text-[var(--muted)] shrink-0">{question.header}</span>
              <span className="text-xs text-[var(--muted)] opacity-50">·</span>
              <span className="text-sm">{answer}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
