"use client";

import { type CumulativeSeries, type RadarAxis } from "@/lib/stats";


const SERIES_COLORS = [
  "#ef4444", "#2563eb", "#22c55e", "#a855f7", "#f59e0b",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
];


function niceStep(range: number): number {
  const rough = range / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough || 1));
  const normalized = rough / magnitude;
  const step = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
  return step * magnitude;
}


export function CumulativeChart({ series }: { series: CumulativeSeries[] }) {
  const width = 340;
  const height = 240;
  const padLeft = 44;
  const padBottom = 28;
  const padTop = 12;
  const padRight = 12;

  const allPoints = series.flatMap((s) => s.points);
  if (allPoints.length === 0) {
    return <p className="text-black/40 text-sm text-center py-8 font-bold">Not enough games yet.</p>;
  }

  const minDate = Math.min(...allPoints.map((p) => p.date));
  const maxDate = Math.max(...allPoints.map((p) => p.date));
  const minVal = Math.min(0, ...allPoints.map((p) => p.value));
  const maxVal = Math.max(0, ...allPoints.map((p) => p.value));
  const valRange = maxVal - minVal || 1;
  const dateRange = maxDate - minDate || 1;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const x = (date: number) => padLeft + ((date - minDate) / dateRange) * plotW;
  const y = (value: number) => padTop + (1 - (value - minVal) / valRange) * plotH;

  const step = niceStep(valRange);
  const gridLines: number[] = [];
  for (let v = Math.ceil(minVal / step) * step; v <= maxVal; v += step) gridLines.push(v);

  const formatTick = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return `${v}`;
  };

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ display: "block" }}>
        {gridLines.map((v) => (
          <g key={v}>
            <line x1={padLeft} y1={y(v)} x2={width - padRight} y2={y(v)} stroke="#000" strokeWidth={v === 0 ? 1.5 : 0.5} strokeDasharray={v === 0 ? "none" : "2 3"} opacity={v === 0 ? 0.6 : 0.2} />
            <text x={padLeft - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fontWeight="800" fill="#000" opacity={0.5}>{formatTick(v)}</text>
          </g>
        ))}
        {series.map((s, i) => {
          const color = SERIES_COLORS[i % SERIES_COLORS.length];
          const d = s.points.map((p, j) => `${j === 0 ? "M" : "L"} ${x(p.date).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {s.points.map((p, j) => (
                <circle key={j} cx={x(p.date)} cy={y(p.value)} r={2.5} fill="#F5F0E8" stroke={color} strokeWidth={1.5} />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 px-1">
        {series.map((s, i) => (
          <div key={s.name} className="flex items-center gap-1.5">
            <span className="w-3 h-1.5" style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }} />
            <span className="text-xs font-black uppercase text-black">{s.name}</span>
            <span className={`text-xs font-black tabular-nums ${s.final > 0 ? "text-green-600" : s.final < 0 ? "text-red-500" : "text-black/40"}`}>
              {(s.final > 0 ? "+" : "") + Math.round(s.final).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


export function RadarChart({ axes, nameA, nameB }: { axes: RadarAxis[]; nameA: string; nameB: string }) {
  const size = 280;
  const center = size / 2;
  const radius = size / 2 - 44;
  const count = axes.length;

  const point = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const r = (value / 100) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const polygon = (key: "a" | "b") =>
    axes.map((axis, i) => { const p = point(i, axis[key]); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ");

  const rings = [25, 50, 75, 100];

  return (
    <div className="w-full flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px]" style={{ display: "block" }}>
        {rings.map((ring) => (
          <polygon
            key={ring}
            points={axes.map((_, i) => { const p = point(i, ring); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ")}
            fill="none" stroke="#000" strokeWidth={0.5} opacity={0.2}
          />
        ))}
        {axes.map((_, i) => { const p = point(i, 100); return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#000" strokeWidth={0.5} opacity={0.2} />; })}
        <polygon points={polygon("b")} fill="#ef4444" fillOpacity={0.2} stroke="#ef4444" strokeWidth={2} />
        <polygon points={polygon("a")} fill="#2563eb" fillOpacity={0.2} stroke="#2563eb" strokeWidth={2} />
        {axes.map((axis, i) => {
          const p = point(i, 118);
          return <text key={axis.label} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="800" fill="#000" opacity={0.6}>{axis.label}</text>;
        })}
      </svg>
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3" style={{ backgroundColor: "#2563eb" }} /><span className="text-xs font-black uppercase text-black">{nameA}</span></div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3" style={{ backgroundColor: "#ef4444" }} /><span className="text-xs font-black uppercase text-black">{nameB}</span></div>
      </div>
    </div>
  );
}
