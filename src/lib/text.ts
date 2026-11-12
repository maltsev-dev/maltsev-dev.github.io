/**
 * The title as the site shows it.
 *
 * The corpus used to carry emoji in its titles — a tomato on the Pomodoro
 * write-up, an hourglass on the TUI one, a stack of books on the others.
 * They were the publishing platform's own ornaments, and on a phosphor screen
 * they were the only full-colour thing on the page: a pictogram in the middle
 * of an amber mono heading, in a page of box drawing and rules, breaks the
 * thing it is sitting in.
 *
 * The titles have been cleaned up, so nothing here has an ornament to take
 * off any more. The stripping stays as the rule that keeps it that way, and as
 * the answer for the next post that arrives with one. Everything that shows a
 * title goes through here: the page, the listing, the feed, the map, the
 * social card. One definition, so a title cannot be plain on one page and
 * decorated on another.
 *
 * The same rule lives in the rehype plugin, because the body of a post is
 * held to it as well: a page cannot be monochrome with a pictogram in its
 * heading and colour in its body.
 */
import { stripPictograms } from '../plugins/rehype-strip-pictograms.mjs';

/**
 * A title with its ornaments taken off.
 *
 * The whitespace that was holding one is collapsed afterwards: a title that
 * was `🍅 TUI Pomodoro App` is `TUI Pomodoro App` and not ` TUI Pomodoro App`.
 */
export const stripEmoji = (text: string): string =>
  stripPictograms(text).replace(/[ \t]{2,}/g, ' ').trim();

/**
 * The title of a thing, as the site draws it.
 *
 * A title that is nothing but an ornament — which no title here is, but the
 * rule should not depend on that — falls back to the original, so the page
 * never ends up with an empty heading.
 */
export const displayTitle = (title: string): string => stripEmoji(title) || title;
