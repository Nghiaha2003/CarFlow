import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, FileSpreadsheet, DollarSign, Gauge } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { useLanguage } from '../context/LanguageContext';

export default function CommandCenterPage() {
  const { lang } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState('revenue'); // 'revenue' | 'yieldPct' | 'utilizationPct'

  useEffect(() => {
    const controller = new AbortController();
    apiClient('/api/v1/analytics/command-center', { signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) setData(res);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  if (loading && !data) {
    return <div className="h-[520px] rounded-3xl bg-white border border-slate-200 animate-pulse" />;
  }

  const series = data?.trendSeries || [];
  const allocation = data?.allocation || [];
  const kpis = data?.kpis || { avgApr: 13.8, avgUtilization: 91 };

  // Build SVG Area Chart coordinates matching Figure 5.20
  const width = 640;
  const height = 240;
  const padX = 44;
  const padY = 24;
  const values = series.map((d) => d[metric] || 0);
  const maxVal = Math.max(...values, 1) * 1.1;

  const points = series.map((d, i) => {
    const x = padX + (i * (width - padX * 1.5)) / Math.max(series.length - 1, 1);
    const y = height - padY - ((d[metric] || 0) / maxVal) * (height - padY * 2);
    return { x, y, label: d.month, val: d[metric] };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height - padY} L ${points[0].x.toFixed(1)} ${height - padY} Z`
      : '';

  return (
    <div className="space-y-6">
      {/* Top Row matching Figure 5.20: Left 8 Cols Trend Chart + Right 4 Cols Portfolio Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue and Yield Trend Card */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">
                {lang === 'vi' ? 'Xu hướng Doanh thu & Hiệu suất Lợi tức' : 'Revenue and Yield Trend'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'vi'
                  ? 'Doanh thu khai thác đội xe theo tháng và lợi tức quy đổi năm.'
                  : 'Monthly lease revenue and implied annual yield.'}
              </p>
            </div>

            <div className="inline-flex bg-slate-100 p-1 rounded-xl">
              {[
                { key: 'revenue', label: 'REVENUE' },
                { key: 'yieldPct', label: 'YIELD' },
                { key: 'utilizationPct', label: 'UTILIZATION' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setMetric(t.key)}
                  className={`px-3.5 py-1.5 rounded-lg text-[11px] font-extrabold tracking-wider transition ${
                    metric === t.key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64">
              <defs>
                <linearGradient id="carflowArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0D9488" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = height - padY - ratio * (height - padY * 2);
                const tickVal = Math.round(maxVal * ratio);
                const formatted =
                  metric === 'revenue'
                    ? `$${Math.round(tickVal / 1000)}k`
                    : `${tickVal}%`;
                return (
                  <g key={idx}>
                    <line
                      x1={padX}
                      y1={y}
                      x2={width - 16}
                      y2={y}
                      stroke="#F1F5F9"
                      strokeWidth="1"
                    />
                    <text x={6} y={y + 4} className="fill-slate-400 text-[10px] font-semibold">
                      {formatted}
                    </text>
                  </g>
                );
              })}

              {areaPath && <path d={areaPath} fill="url(#carflowArea)" />}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#0F766E"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {points.map((p) => (
                <g key={p.label}>
                  <circle cx={p.x} cy={p.y} r="4" fill="#0F766E" stroke="#FFFFFF" strokeWidth="2" />
                  <text
                    x={p.x}
                    y={height - 6}
                    textAnchor="middle"
                    className="fill-slate-400 text-[10px] font-semibold"
                  >
                    {p.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Portfolio Allocation Card matching Figure 5.20 */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Portfolio Allocation</h2>
                <p className="text-xs text-slate-500">Vehicle segment exposure.</p>
              </div>
              <Gauge className="w-5 h-5 text-teal-600" />
            </div>

            <div className="space-y-4 mt-6">
              {allocation.map((item) => (
                <div key={item.segment} className="flex items-center gap-3 text-xs">
                  <span className="w-20 text-right font-semibold text-slate-500">{item.segment}</span>
                  <div className="flex-1 h-5 rounded-lg bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-lg bg-amber-500 transition-all"
                      style={{ width: `${Math.max(item.percentage, item.valueUsd > 0 ? 12 : 4)}%` }}
                    />
                  </div>
                  <span className="w-9 font-bold text-slate-700 tabular-nums">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] font-bold uppercase text-slate-400">AVG APR</div>
              <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                {kpis.avgApr}%
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
              <div className="text-[10px] font-bold uppercase text-teal-700">UTILIZATION</div>
              <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                {kpis.avgUtilization}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 3 Operational Feeds matching Figure 5.20 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-teal-600" />
              <span>Compliance Queue</span>
            </h3>
            <Link to="/admin" className="text-xs font-bold text-brand-blue hover:underline">
              Review →
            </Link>
          </div>
          {(data?.complianceQueue || []).map((u) => (
            <div
              key={u.id}
              className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-bold text-slate-800">{u.fullName}</div>
                <div className="text-[10px] text-slate-400 uppercase">{u.role}</div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  u.kycStatus === 'VERIFIED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {u.kycStatus}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-500" />
              <span>Tokenization Pipeline</span>
            </h3>
            <Link to="/admin" className="text-xs font-bold text-brand-blue hover:underline">
              Mint →
            </Link>
          </div>
          {(data?.tokenizationPipeline || []).map((a) => (
            <div
              key={a.id}
              className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
            >
              <div className="min-w-0 pr-2">
                <div className="font-bold text-slate-800 truncate">{a.vehicleName}</div>
                <div className="text-[10px] text-slate-400">{a.assetCode}</div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  a.status === 'TOKENIZED'
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {a.status}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-brand-blue" />
              <span>Recent Activity</span>
            </h3>
            <Link to="/transfers" className="text-xs font-bold text-brand-blue hover:underline">
              All →
            </Link>
          </div>
          {(data?.recentActivity || []).slice(0, 5).map((act) => (
            <div
              key={act.id}
              className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
            >
              <div className="min-w-0 pr-2">
                <div className="font-bold text-slate-800 truncate">{act.vehicleName}</div>
                <div className="text-[10px] text-slate-500 uppercase">
                  {act.type} · {act.actor}
                </div>
              </div>
              <strong className="text-teal-700 font-extrabold tabular-nums shrink-0">
                ${act.valueUsd.toLocaleString()}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
