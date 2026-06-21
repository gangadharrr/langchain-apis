export interface QuestionOption {
  label: string;
  description: string;
}

export interface Question {
  question: string;
  header: string;
  options: QuestionOption[];
  multiSelect: boolean;
}

export interface AskUserQuestionInput {
  questions: Question[];
}

export interface AskUserQuestionResult {
  answers: Record<string, string>;
  cancelled: boolean;
}

export interface QuestionFormState {
  selectedAnswers: Record<number, string[]>;
  customInputs: Record<number, string>;
  otherSelected: Record<number, boolean>;
}
