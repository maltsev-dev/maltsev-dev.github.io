/**
 * The theme list, in one place.
 *
 * There were three copies of the same names: the picker in the header, the
 * boot script in the page head, and the table of ramps in `os.js`. They
 * drifted — the picker offered a theme the boot script did not know, and the
 * chrome color was written out again as a literal hex in the layout, in the
 * script and in the stylesheet.
 *
 * `system` is not a ramp of its own: it is the OS preference resolved to one
 * of the two at runtime (light → acidule, dark → phosphore). The picker
 * offers it as a third option so the site can follow the reader's system
 * instead of making them choose.
 */

export interface Theme {
  /** The value stored in `localStorage.theme` and in `data-set-theme`. */
  id: string;
  /** The name shown in the picker. */
  label: string;
  /** The one-line description under the name. */
  desc: string;
  /** The short code the status line shows: `p1-green`, `p3-amber`. */
  phosphor: string;
  /** The browser chrome color — the page's own ground, in hex. */
  color: string;
}

/** The ramps the stylesheet defines. `system` is not one of them. */
export const RAMPS = ['acidule', 'phosphore'] as const;

export type Ramp = (typeof RAMPS)[number];

/** The ramp the site boots on: the green tube. */
export const DEFAULT_RAMP: Ramp = 'acidule';

/**
 * What `system` resolves to on a light and on a dark OS.
 *
 * There is no light ramp any more — the paper theme is gone — so a reader on
 * a light OS gets the green tube and a reader on a dark one gets the amber.
 */
export const SYSTEM_LIGHT: Ramp = 'acidule';
export const SYSTEM_DARK: Ramp = 'phosphore';

export const THEMES: Theme[] = [
  { id: 'acidule', label: 'P1 green', desc: 'green phosphor', phosphor: 'p1-green', color: '#000a06' },
  { id: 'phosphore', label: 'P3 amber', desc: 'amber phosphor', phosphor: 'p3-amber', color: '#0d0a05' },
  { id: 'system', label: 'system', desc: 'follow the system', phosphor: 'auto', color: '#000a06' },
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
