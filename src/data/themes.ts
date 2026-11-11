/**
 * The theme list, in one place.
 *
 * There were three copies of the same four names: the picker in the header,
 * the boot script in the page head, and the table of ramps in `os.js`. They
 * drifted — the picker offered a theme the boot script did not know, and the
 * chrome color was written out again as a literal hex in the layout, in the
 * script and in the stylesheet.
 *
 * `system` is not a ramp of its own: it is the OS preference resolved to one
 * of the three at runtime (light → pierre, dark → phosphore). The picker
 * offers it as a fourth option so the site can follow the reader's system
 * instead of making them choose.
 */

export interface Theme {
  /** The value stored in `localStorage.theme` and in `data-set-theme`. */
  id: string;
  /** The name shown in the picker. */
  label: string;
  /** The one-line description under the name. */
  desc: string;
  /** The browser chrome color — the page's paper, in hex. */
  color: string;
}

/** The ramps the stylesheet defines. `system` is not one of them. */
export const RAMPS = ['phosphore', 'acidule', 'pierre'] as const;

export type Ramp = (typeof RAMPS)[number];

/** The ramp the site boots on. */
export const DEFAULT_RAMP: Ramp = 'phosphore';

/** What `system` resolves to on a light and on a dark OS. */
export const SYSTEM_LIGHT: Ramp = 'pierre';
export const SYSTEM_DARK: Ramp = 'phosphore';

export const THEMES: Theme[] = [
  { id: 'phosphore', label: 'phosphore', desc: 'amber on black', color: '#14100a' },
  { id: 'acidule', label: 'acidule', desc: 'green on teal', color: '#01141d' },
  { id: 'pierre', label: 'pierre', desc: 'warm light', color: '#f4efe6' },
  { id: 'system', label: 'system', desc: 'follow the system', color: '#14100a' },
];

/** The ramp a theme id resolves to. `system` follows the OS preference. */
export function resolveRamp(id: string, prefersLight: boolean): Ramp {
  if (id === 'system') return prefersLight ? SYSTEM_LIGHT : SYSTEM_DARK;
  return (RAMPS as readonly string[]).includes(id) ? (id as Ramp) : DEFAULT_RAMP;
}

/** The chrome color of a ramp. */
export function themeColor(id: string): string {
  const theme = THEMES.find((t) => t.id === id);
  return theme ? theme.color : THEMES[0].color;
}
