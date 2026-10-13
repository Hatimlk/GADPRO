/**
 * Validated chart color tokens (dataviz skill reference palette, light mode).
 * Categorical order is the CVD-safety mechanism â€” assign in sequence, never
 * cycle/reorder. Verified with the skill's validate_palette.js: all 8 slots
 * pass lightness/chroma/CVD/normal-vision checks (خ”E 9.1 CVD / 19.6 normal
 * worst adjacent pair); slots 1-2 alone (the only pair this dashboard pairs
 * side by side) pass every check with zero WARNs.
 */
export const CATEGORICAL = [
  '#2a78d6', // slot 1 â€” blue
  '#eb6834', // slot 2 â€” orange
  '#1baf7a', // slot 3 â€” aqua
  '#eda100', // slot 4 â€” yellow
  '#e87ba4', // slot 5 â€” magenta
  '#008300', // slot 6 â€” green
  '#4a3aa7', // slot 7 â€” violet
  '#e34948', // slot 8 â€” red
] as const;

/** Sequential single-hue ramp (blue), for magnitude â€” one hue, light to dark. */
export const SEQUENTIAL_BLUE = {
  100: '#cde2fb',
  200: '#9ec5f4',
  300: '#6da7ec',
  400: '#3987e5',
  450: '#2a78d6',
  500: '#256abf',
  600: '#184f95',
  700: '#0d366b',
};

/** Chart chrome â€” recessive ink for grid/axis/labels, never the data color. */
export const CHART_INK = {
  gridline: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
  secondary: '#52514e',
  primary: '#0b0b0b',
};

