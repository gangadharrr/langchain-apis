import { useState } from 'react';
import { useTool } from '../../../hooks/useTool';
import type { AskUserQuestionInput, AskUserQuestionResult, Question } from './types';
import { QuestionForm } from './question-form';
import { CompletedAnswersUI } from './completed-answers-ui';
import { CancelledAnswersUI } from './cancelled-answers-ui';
import { parseQuestions } from './utils';

const schema: Record<string, unknown> = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      description: 'Array of questions to ask the user',
      items: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'The question text to ask the user',
          },
          header: {
            type: 'string',
            description: 'A brief header/title for the question',
          },
          options: {
            type: 'array',
            description: 'Array of predefined options for the user to choose from',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', description: 'The option label' },
                description: { type: 'string', description: 'Description of the option' },
              },
              required: ['label', 'description'],
            },
            minItems: 1,
          },
          multiSelect: {
            type: 'boolean',
            description: 'Whether the user can select multiple options (true) or just one (false)',
          },
        },
        required: ['question', 'header', 'options', 'multiSelect'],
      },
      minItems: 1,
    },
  },
  required: ['questions'],
};

export function AskQuestionTool() {
  const [completedResult, setCompletedResult] = useState<{ questions: Question[]; answers: Record<string, string> } | null>(null);
  const [cancelled, setCancelled] = useState(false);

  useTool<AskUserQuestionInput, AskUserQuestionResult>({
    name: 'ask_user_question',
    description: `Ask the user one or more questions with predefined options. Use this when you need user input to make decisions or gather information.

Each question supports:
- Single-select mode (radio buttons) or multi-select mode (checkboxes)
- Predefined options with labels and descriptions
- Optional "Other" option with custom text input (automatically included)`,
    schema,
    render: ({ args, onSubmit }) => {
      let questions = parseQuestions(args.questions);
      if (!questions) {
        questions = parseQuestions(args);
      }

      if (!questions || questions.length === 0) {
        return <div className="p-2 text-xs text-red-500">No questions found in args</div>;
      }

      if (!questions || questions.length === 0) {
        return null;
      }

      if (cancelled) {
        return <CancelledAnswersUI />;
      }

      if (completedResult) {
        return (
          <CompletedAnswersUI
            questions={completedResult.questions}
            answers={completedResult.answers}
          />
        );
      }

      return (
        <QuestionForm
          questions={questions}
          onSubmit={(answers) => {
            setCompletedResult({ questions, answers });
            onSubmit({ answers, cancelled: false });
          }}
          onCancel={() => {
            setCancelled(true);
            onSubmit({ answers: {}, cancelled: true });
          }}
        />
      );
    },
    handle: (_args, result) => {
      if (result.cancelled) {
        return {
          externalToolResponse: 'failure',
          failureMessage: 'The user cancelled the question',
        };
      }
      return {
        externalToolResponse: 'success',
        successMessage: JSON.stringify(result.answers),
      };
    },
  });

  return null;
}
