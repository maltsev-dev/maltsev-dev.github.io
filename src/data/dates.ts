/**
 * Dates as the site shows them.
 *
 * The corpus stores dates the way a machine reads them — `2026-04-07` — and
 * that is what the machine-readable map and the feeds want. A reader wants
 * the other thing: "7 April 2026". The two are the same date, but only one of
 * them reads like a sentence, so the formatting happens once, here.
 */

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * An ISO date as the site writes it.
 *
 * `2026-04-07` becomes `7 April 2026`. Anything that is not a date — an empty
 * field, a value in another shape — is returned as it came in rather than
 * being guessed at, so a bad value shows itself instead of rendering as
 * "Invalid Date".
 */
export function formatDate(iso: string | undefined): string {
  if (!iso) return '';

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return iso;

  const [, year, month, day] = match;
  const name = MONTHS[Number(month) - 1];
  if (!name) return iso;

  return `${Number(day)} ${name} ${year}`;
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * The same date, in the shape a directory listing uses.
 *
 * `2026-04-07` becomes `7 Apr 2026` — eleven characters, so a column of
 * dates lines up in a listing without the wide columns a spelled-out month
 * would need. The full name is still there in the `datetime` attribute of
 * the element that carries it, which is where a machine reads it.
 */
export function formatDateShort(iso: string | undefined): string {
  if (!iso) return '';

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return iso;

  const [, year, month, day] = match;
  const name = SHORT_MONTHS[Number(month) - 1];
  if (!name) return iso;

  return `${Number(day)} ${name} ${year}`;
}
