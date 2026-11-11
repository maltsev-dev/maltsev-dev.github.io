/**
 * The three case studies, and the year each one was written.
 *
 * Nothing in the repository dates them: the front matter carries no date, the
 * JSON sidecars the pages are built from carry no date, and neither does the
 * legacy HTML the sidecars are parsed out of. The one date a case study does
 * carry is the copyright line in its own legacy footer — "© A.Maltsev 2026".
 *
 * That year is what the case pages show. It is deliberately a year and not a
 * day: a day would have to be invented, and an invented date on a page about
 * real systems is worse than no date at all.
 *
 * A front matter date, if one is ever added, takes precedence — the front
 * matter is the closer source, and this table is only the fallback.
 */
export const CASE_YEARS: Record<string, number> = {
  'email-reply-agent': 2026,
  'lead-qualification-agent': 2026,
  'support-triage-agent': 2026,
};
