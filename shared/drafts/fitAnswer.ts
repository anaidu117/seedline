// Fitted drafts (spec 7.7). Templates only, no AI: picks the longest saved version that fits the word limit.
import { ANSWER_LENGTHS, valueLabel, type AnswerKey, type AnswerLength } from '../vocab.ts';
import type { ApplicationQuestion } from '../matching/types.ts';

export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export type SavedAnswers = Partial<Record<AnswerKey, Partial<Record<AnswerLength, string>>>>;

export type Fitted =
  | { status: 'filled'; text: string; length: AnswerLength; words: number }
  | { status: 'flagged'; reason: string; text: string };

/** Longest first, so the founder gets the most detail the limit allows. */
const LONGEST_FIRST: AnswerLength[] = [...ANSWER_LENGTHS].reverse();

export function fitAnswer(q: ApplicationQuestion, saved: SavedAnswers): Fitted {
  if (!q.maps_to) return { status: 'flagged', reason: 'No answer bank topic matches this question. Write this one yourself.', text: '' };
  const versions = saved[q.maps_to] ?? {};
  const available = LONGEST_FIRST.filter((l) => (versions[l] ?? '').trim() !== '');
  const topic = valueLabel(q.maps_to).toLowerCase();
  if (available.length === 0) return { status: 'flagged', reason: `You haven't saved a ${topic} answer yet. Add one in your answer bank.`, text: '' };
  for (const l of available) {
    const text = versions[l]!.trim();
    const words = wordCount(text);
    if (q.word_limit === null || words <= q.word_limit) return { status: 'filled', text, length: l, words };
  }
  const shortest = available[available.length - 1];
  return {
    status: 'flagged',
    reason: `All your saved ${topic} answers are over the ${q.word_limit}-word limit. Your ${shortest} version is ${wordCount(versions[shortest]!)} words. Trim it below.`,
    text: versions[shortest]!.trim(),
  };
}
