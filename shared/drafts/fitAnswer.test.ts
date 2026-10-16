import { describe, expect, it } from 'vitest';
import { fitAnswer, wordCount } from './fitAnswer.ts';

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');
const saved = { problem: { short: words(20), medium: words(60), long: words(150) } };

describe('fitAnswer', () => {
  it('picks the longest version under the word limit', () => {
    expect(fitAnswer({ text: 'Q', word_limit: 100, maps_to: 'problem' }, saved)).toMatchObject({ status: 'filled', length: 'medium', words: 60 });
    expect(fitAnswer({ text: 'Q', word_limit: 150, maps_to: 'problem' }, saved)).toMatchObject({ status: 'filled', length: 'long' });
    expect(fitAnswer({ text: 'Q', word_limit: 20, maps_to: 'problem' }, saved)).toMatchObject({ status: 'filled', length: 'short' });
  });

  it('uses the longest version when there is no limit', () => {
    expect(fitAnswer({ text: 'Q', word_limit: null, maps_to: 'problem' }, saved)).toMatchObject({ length: 'long' });
  });

  it('skips empty versions', () => {
    expect(fitAnswer({ text: 'Q', word_limit: 500, maps_to: 'problem' }, { problem: { short: words(5), long: '  ' } })).toMatchObject({ length: 'short' });
  });

  it('flags questions with no maps_to', () => {
    const r = fitAnswer({ text: 'Q', word_limit: 50, maps_to: null }, saved);
    expect(r.status).toBe('flagged');
    expect(r.text).toBe('');
  });

  it('flags questions with no saved answer', () => {
    const r = fitAnswer({ text: 'Q', word_limit: 50, maps_to: 'team' }, saved);
    expect(r).toMatchObject({ status: 'flagged', text: '' });
    if (r.status === 'flagged') expect(r.reason).toMatch(/team answer/);
  });

  it('flags when every version is over the limit, offering the shortest to trim', () => {
    const r = fitAnswer({ text: 'Q', word_limit: 10, maps_to: 'problem' }, saved);
    expect(r.status).toBe('flagged');
    if (r.status === 'flagged') expect(r.reason).toMatch(/over the 10-word limit. Your short version is 20 words/);
  });
});

describe('wordCount', () => {
  it('counts words across whitespace', () => {
    expect(wordCount('  one two\nthree\tfour ')).toBe(4);
    expect(wordCount('')).toBe(0);
  });
});
