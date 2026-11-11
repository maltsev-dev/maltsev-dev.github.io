/**
 * The two numbers the site keeps repeating, derived instead of written.
 *
 * Both of them were once typed into three different pages, and both went
 * stale: the pyramid held fewer skills than the copy claimed, and the career
 * was longer than the copy said. A number that appears in prose cannot be
 * checked by a build, so it silently becomes a lie.
 *
 * Both now come from the data they describe — the skill tiers and the start
 * date — and both are rendered through the same helpers, so a page cannot
 * disagree with another page about how long this has been going on. No count
 * is written here either: the constants below are the only place the numbers
 * are allowed to exist.
 */

import { SKILL_TIERS } from '../data/skills';

/**
 * When the work started: the first of the six stops on /experience/.
 *
 * The month is the one the profile records. The day is the first, so the
 * count rolls over on a fixed day of the month rather than drifting with the
 * time of day the site happens to be built.
 */
export const EXPERIENCE_START = '2019-05-01';

/** How many skills the pyramid holds. Counted, not typed. */
export const SKILL_COUNT = SKILL_TIERS.reduce((total, tier) => total + tier.skills.length, 0);

/**
 * Years of practice, rounded to the nearest whole year.
 *
 * Rounded rather than truncated: seven and a half years of work is eight
 * years of work in the way anyone counts a career, and truncating would
 * understate it by a year for half of every year.
 */
export function yearsOfExperience(now: Date = new Date()): number {
  const start = new Date(`${EXPERIENCE_START}T00:00:00Z`);
  const years = (now.getTime() - start.getTime()) / (365.2425 * 24 * 60 * 60 * 1000);
  return Math.max(1, Math.round(years));
}

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/**
 * A small number in words, for the sentences where a digit reads wrong.
 *
 * Only covers what a career length and a skill count can be. Past a hundred
 * it returns the digits, because "one hundred and twelve" is not worth the
 * code.
 *
 * `capitalize` is for the case where the number opens the sentence: a
 * sentence may not start with a lower-case word.
 */
export function spellNumber(value: number, capitalize = false): string {
  let word: string;
  if (value < 0 || value >= 100) {
    word = String(value);
  } else if (value < 20) {
    word = ONES[value];
  } else {
    const tens = TENS[Math.floor(value / 10)];
    const ones = value % 10;
    word = ones ? `${tens}-${ONES[ones]}` : tens;
  }
  return capitalize ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}
