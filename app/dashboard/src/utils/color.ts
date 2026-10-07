// chart colors: the panel's soft palette first (calm, readable on light and dark),
// then evenly spread muted hues if a chart has more series than that
const SOFT = ["#5b7cfa", "#3fb68b", "#e9a23b", "#e46f9f", "#2fb3c6", "#a26cf0", "#ef7a6b", "#62708a"];

export function generateDistinctColors(numColors: number) {
  const colors = SOFT.slice(0, numColors);
  const extra = numColors - colors.length;
  for (let i = 0; i < extra; i++) {
    colors.push(hslToHex((i * 360) / Math.max(extra, 1) + 20, 55, 60));
  }
  return colors;
}

function hslToHex(h: number, s: number, l: number) {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hueToRgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = Math.round(hueToRgb(p, q, h + 1 / 3) * 255);
    g = Math.round(hueToRgb(p, q, h) * 255);
    b = Math.round(hueToRgb(p, q, h - 1 / 3) * 255);
  }

  const toHex = (c: number) => {
    const hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
