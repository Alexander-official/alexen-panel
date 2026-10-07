import { FC, lazy, memo, useMemo } from "react";

const ApexChart = lazy(() => import("react-apexcharts"));

// redraws only when the data or the look really changed: ApexCharts animates
// every update, and a parent rendering every few seconds kept it busy forever
const sig = (v: any) => JSON.stringify(v, (_k, x) => (typeof x === "function" ? String(x) : x));
export const StableChart: FC<any> = memo(
  ({ options, series, type, height }) => {
    const many = Array.isArray(series) && series.some((x: any) => Array.isArray(x?.data) && x.data.length * series.length > 120);
    const opts = useMemo(
      () => ({ ...options, chart: { ...(options?.chart || {}), animations: { enabled: !many, speed: 300, dynamicAnimation: { enabled: false } } } }),
      [sig(options), many]
    );
    return <ApexChart type={type} options={opts} series={series} height={height} />;
  },
  (a, b) => a.type === b.type && a.height === b.height && sig(a.series) === sig(b.series) && sig(a.options) === sig(b.options)
);
