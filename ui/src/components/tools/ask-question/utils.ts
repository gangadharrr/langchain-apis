import type { Question } from './types';

export function parseQuestions(raw: unknown): Question[] | null {
  if (!raw) return null;

  let parsed = raw;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }

  const arr = Array.isArray(parsed) ? parsed : [parsed];
  if (arr.length === 0) return null;
  if (typeof arr[0] !== 'object' || !('question' in (arr[0] as object))) return null;
  return arr as Question[];
}
