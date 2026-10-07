// Light SVG charts in place of ApexCharts (which cost seconds of CPU on every
// page with a chart). Takes the same {type, options, series} the pages already
// pass, reads what it needs from them: donut, horizontal bars, and (stacked)
// area / bar series over time. Hover shows the values.
import { Box, HStack, Text, useColorMode } from "@chakra-ui/react";
import { FC, memo, useEffect, useMemo, useRef, useState } from "react";
import { generateDistinctColors } from "utils/color";

type Props = { type: string; options: any; series: any; height?: number | string };

const useWidth = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => {
      const nw = el.clientWidth;
      setW((old) => (Math.abs(old - nw) > 2 ? nw : old));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
};

const fmtOf = (options: any) => {
  const f = options?.tooltip?.y?.formatter || options?.yaxis?.labels?.formatter;
  return (v: number) => {
    try {
      return f ? String(f(v)) : String(Math.round(v * 100) / 100);
    } catch {
      return String(v);
    }
  };
};
const axisFmtOf = (options: any) => {
  const f = options?.yaxis?.labels?.formatter || options?.xaxis?.labels?.formatter;
  return (v: number) => {
    try {
      return f ? String(f(v)) : String(Math.round(v));
    } catch {
      return String(v);
    }
  };
};

const Legend: FC<{ items: { name: string; color: string }[] }> = ({ items }) => (
  <HStack spacing={3} justify="center" flexWrap="wrap" rowGap={1} mt={2}>
    {items.map((it) => (
      <HStack key={it.name} spacing={1.5}>
        <Box w="10px" h="10px" borderRadius="full" style={{ background: it.color }} />
        <Text fontSize="xs" color="gray.500">
          {it.name}
        </Text>
      </HStack>
    ))}
  </HStack>
);

const Tip: FC<{ x: number; y: number; w: number; children: any }> = ({ x, y, w, children }) => (
  <Box
    position="absolute"
    top={`${Math.max(0, y)}px`}
    left={`${Math.min(Math.max(0, x + 12), Math.max(0, w - 190))}px`}
    pointerEvents="none"
    zIndex={2}
    bg="var(--tier-1)"
    borderWidth="1px"
    borderColor="var(--tier-line)"
    borderRadius="10px"
    px={2.5}
    py={1.5}
    boxShadow="0 8px 24px rgba(0,0,0,.18)"
    fontSize="xs"
    minW="120px"
  >
    {children}
  </Box>
);

// ---- donut ----
const Donut: FC<Props> = ({ options, series, height }) => {
  const values: number[] = (series || []).map((v: any) => Number(v) || 0);
  const labels: string[] = options?.labels || [];
  const colors: string[] = options?.colors || generateDistinctColors(values.length);
  const fmt = fmtOf(options);
  const total = values.reduce((a, b) => a + b, 0);
  const [hover, setHover] = useState(-1);
  const size = 220;
  const r = 90;
  const stroke = 30;
  let acc = 0;
  const C = 2 * Math.PI * r;
  const title = options?.title?.text;
  return (
    <Box textAlign="center" style={{ minHeight: typeof height === "number" ? height : undefined }}>
      {title && (
        <Text fontSize="sm" fontWeight="medium" mb={2}>
          {title}
        </Text>
      )}
      <Box position="relative" w={`${size}px`} h={`${size}px`} mx="auto">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--tier-item)" strokeWidth={stroke} />
          {total > 0 &&
            values.map((v, i) => {
              const len = (v / total) * C;
              const dash = `${Math.max(0, len - (values.filter(Boolean).length > 1 ? 2 : 0))} ${C}`;
              const el = (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={colors[i % colors.length]}
                  strokeWidth={hover === i ? stroke + 6 : stroke}
                  strokeDasharray={dash}
                  strokeDashoffset={-acc}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{ cursor: "pointer", transition: "stroke-width .12s" }}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(-1)}
                />
              );
              acc += len;
              return el;
            })}
        </svg>
        <Box position="absolute" inset={0} display="flex" flexDirection="column" alignItems="center" justifyContent="center" pointerEvents="none">
          <Text fontSize="xs" color="gray.500" noOfLines={1} maxW="120px">
            {hover >= 0 ? labels[hover] : ""}
          </Text>
          <Text fontSize="xl" fontWeight="semibold">
            {hover >= 0 ? fmt(values[hover]) : fmt(total)}
          </Text>
          {hover >= 0 && total > 0 && (
            <Text fontSize="xs" color="gray.500">
              {Math.round((values[hover] / total) * 1000) / 10}%
            </Text>
          )}
        </Box>
      </Box>
      {options?.legend?.show !== false && <Legend items={labels.map((name, i) => ({ name, color: colors[i % colors.length] }))} />}
    </Box>
  );
};

// ---- horizontal bars (a share per category) ----
const HBars: FC<Props> = ({ options, series }) => {
  const data: number[] = (series?.[0]?.data || []).map((v: any) => Number(v) || 0);
  const cats: string[] = options?.xaxis?.categories || [];
  const colors: string[] = options?.colors || generateDistinctColors(data.length);
  const fmt = fmtOf(options);
  const max = Math.max(1, ...data);
  return (
    <Box>
      {data.map((v, i) => (
        <Box key={i} mb={2}>
          <HStack justifyContent="space-between" fontSize="xs" mb={0.5}>
            <Text noOfLines={1}>{cats[i]}</Text>
            <Text color="gray.500">{fmt(v)}</Text>
          </HStack>
          <Box h="8px" borderRadius="full" bg="var(--tier-item)" overflow="hidden">
            <Box h="100%" borderRadius="full" style={{ width: `${(v / max) * 100}%`, background: colors[i % colors.length] }} />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

// ---- series over time: area / line / (stacked) bars ----
const Series: FC<Props & { kind: "area" | "bar" | "line" }> = ({ options, series, height, kind }) => {
  const [ref, width] = useWidth();
  const { colorMode } = useColorMode();
  const H = typeof height === "number" ? height : parseInt(String(height || 260)) || 260;
  const list: { name: string; data: number[] }[] = (series || []).map((s: any) => ({ name: s.name, data: (s.data || []).map((v: any) => Number(v) || 0) }));
  const cats: string[] = options?.xaxis?.categories || [];
  const n = Math.max(cats.length, ...list.map((s) => s.data.length), 0);
  const colors: string[] = options?.colors || generateDistinctColors(list.length);
  const stacked = !!options?.chart?.stacked || kind === "bar";
  const fmt = fmtOf(options);
  const axisFmt = axisFmtOf(options);
  const [hover, setHover] = useState(-1);

  const geo = useMemo(() => {
    const padL = 56;
    const padR = 8;
    const padT = 8;
    const legendH = list.length > 1 || options?.legend?.show ? 0 : 0;
    const padB = 24 + legendH;
    const W = Math.max(120, width);
    const plotW = Math.max(10, W - padL - padR);
    const plotH = Math.max(40, H - padT - padB);
    const totals = Array.from({ length: n }, (_, i) => (stacked ? list.reduce((a, s) => a + (s.data[i] || 0), 0) : Math.max(0, ...list.map((s) => s.data[i] || 0))));
    const max = Math.max(1, ...totals) * 1.08;
    const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const bw = Math.max(1, (plotW / Math.max(1, n)) * 0.72);
    const xb = (i: number) => padL + (i + 0.5) * (plotW / Math.max(1, n));
    const y = (v: number) => padT + plotH - (v / max) * plotH;
    return { padL, padT, plotW, plotH, W, max, x, xb, bw, y };
  }, [width, H, n, stacked, JSON.stringify(list)]);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * (geo.max / 1.08));
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(geo.plotW / 70))));
  const grid = colorMode === "dark" ? "rgba(255,255,255,.07)" : "rgba(16,24,40,.08)";

  // stacked bottoms
  const base = list.map(() => new Array(n).fill(0));
  if (stacked) {
    const run = new Array(n).fill(0);
    list.forEach((s, si) => {
      for (let i = 0; i < n; i++) {
        base[si][i] = run[i];
        run[i] += s.data[i] || 0;
      }
    });
  }
  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const r = (e.target as SVGRectElement).getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = kind === "bar" ? Math.floor((px / r.width) * n) : Math.round((px / r.width) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };
  const gid = useMemo(() => "g" + Math.random().toString(36).slice(2, 8), []);
  return (
    <Box ref={ref} position="relative" w="full">
      {width > 0 && (
        <svg width={geo.W} height={H} style={{ display: "block" }}>
          <defs>
            {list.map((_, si) => (
              <linearGradient key={si} id={`${gid}-${si}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors[si % colors.length]} stopOpacity={0.35} />
                <stop offset="100%" stopColor={colors[si % colors.length]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          {ticks.map((v, i) => (
            <g key={i}>
              <line x1={geo.padL} x2={geo.padL + geo.plotW} y1={geo.y(v)} y2={geo.y(v)} stroke={grid} strokeDasharray="4 4" />
              <text x={geo.padL - 6} y={geo.y(v) + 3} textAnchor="end" fontSize="10" fill="currentColor" opacity={0.55}>
                {axisFmt(v)}
              </text>
            </g>
          ))}
          {cats.map((c, i) =>
            i % every === 0 ? (
              <text key={i} x={kind === "bar" ? geo.xb(i) : geo.x(i)} y={geo.padT + geo.plotH + 16} textAnchor="middle" fontSize="10" fill="currentColor" opacity={0.55}>
                {c}
              </text>
            ) : null
          )}
          {kind === "bar"
            ? list.map((s, si) =>
                s.data.map((v, i) =>
                  v > 0 ? (
                    <rect
                      key={`${si}-${i}`}
                      x={geo.xb(i) - geo.bw / 2}
                      width={geo.bw}
                      y={geo.y(base[si][i] + v)}
                      height={Math.max(0.5, geo.y(base[si][i]) - geo.y(base[si][i] + v))}
                      rx={Math.min(3, geo.bw / 3)}
                      fill={colors[si % colors.length]}
                      opacity={hover === -1 || hover === i ? 0.92 : 0.55}
                    />
                  ) : null
                )
              )
            : list.map((s, si) => {
                const top = s.data.map((v, i) => [geo.x(i), geo.y((stacked ? base[si][i] : 0) + v)]);
                const bottom = s.data.map((_, i) => [geo.x(i), geo.y(stacked ? base[si][i] : 0)]).reverse();
                const line = top.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
                const area = line + bottom.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join("") + "Z";
                return (
                  <g key={si}>
                    {kind === "area" && <path d={area} fill={`url(#${gid}-${si})`} />}
                    <path d={line} fill="none" stroke={colors[si % colors.length]} strokeWidth={2} strokeLinejoin="round" />
                  </g>
                );
              })}
          {hover >= 0 && kind !== "bar" && <line x1={geo.x(hover)} x2={geo.x(hover)} y1={geo.padT} y2={geo.padT + geo.plotH} stroke="currentColor" opacity={0.25} />}
          <rect x={geo.padL} y={geo.padT} width={geo.plotW} height={geo.plotH} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(-1)} />
        </svg>
      )}
      {hover >= 0 && (
        <Tip x={kind === "bar" ? geo.xb(hover) : geo.x(hover)} y={8} w={geo.W}>
          <Text fontWeight="semibold" mb={1}>
            {cats[hover]}
          </Text>
          {list.map((s, si) => (
            <HStack key={si} spacing={1.5} justifyContent="space-between">
              <HStack spacing={1.5}>
                <Box w="8px" h="8px" borderRadius="full" style={{ background: colors[si % colors.length] }} />
                <Text>{s.name}</Text>
              </HStack>
              <Text fontWeight="medium">{fmt(s.data[hover] || 0)}</Text>
            </HStack>
          ))}
        </Tip>
      )}
      {list.length > 1 && <Legend items={list.map((s, si) => ({ name: s.name, color: colors[si % colors.length] }))} />}
    </Box>
  );
};

const sig = (v: any) => JSON.stringify(v, (_k, x) => (typeof x === "function" ? String(x) : x));

export const StableChart: FC<Props> = memo(
  (props) => {
    const t = props.type || props.options?.chart?.type;
    if (t === "donut" || t === "pie") return <Donut {...props} />;
    if (t === "bar" && props.options?.plotOptions?.bar?.horizontal) return <HBars {...props} />;
    return <Series {...props} kind={t === "bar" ? "bar" : t === "line" ? "line" : "area"} />;
  },
  (a, b) => a.type === b.type && a.height === b.height && sig(a.series) === sig(b.series) && sig(a.options) === sig(b.options)
);
