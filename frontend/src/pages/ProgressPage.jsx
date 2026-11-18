import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  CircleDashed,
  RefreshCw,
  Database,
  GitBranch,
  Cpu,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Layers,
  Code2,
} from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { useLanguage } from '../context/LanguageContext';

export default function ProgressPage() {
  const { lang } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProgress = useCallback(async (signal) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient('/api/v1/system/progress', { signal });
      setData(res);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Không thể kết nối tới Backend API.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadProgress(controller.signal);
    return () => controller.abort();
  }, [loadProgress]);

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-36 rounded-3xl bg-white border border-slate-200" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="h-28 rounded-2xl bg-white border border-slate-200" />
          <div className="h-28 rounded-2xl bg-white border border-slate-200" />
          <div className="h-28 rounded-2xl bg-white border border-slate-200" />
        </div>
        <div className="h-96 rounded-3xl bg-white border border-slate-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl bg-white border border-rose-200 p-8 text-center max-w-xl mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          {lang === 'vi' ? 'Không thể tải dữ liệu tiến độ thực tế' : 'Failed to load live system progress'}
        </h2>
        <p className="text-sm text-slate-600 mb-5">{error}</p>
        <button
          onClick={() => loadProgress()}
          className="px-4 py-2 rounded-xl bg-navy-900 text-white text-sm font-bold hover:bg-navy-800"
        >
          {lang === 'vi' ? 'Thử kết nối lại' : 'Retry Connection'}
        </button>
      </div>
    );
  }

  const { project, infrastructure, modules, skills } = data;
  const totalRows = infrastructure.database.tables.reduce((s, t) => s + t.count, 0);

  return (
    <div className="space-y-7">
      {/* Hero Banner */}
      <div className="rounded-3xl bg-navy-900 text-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {lang === 'vi'
                  ? 'BẢNG THEO DÕI TIẾN ĐỘ THỰC TẾ TRÊN WEB THẬT'
                  : 'REAL-TIME WEB BUILD & ARCHITECTURE TRACKER'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {project.name} — {lang === 'vi' ? 'Lộ trình 8 Module Đồ án Tốt nghiệp' : '8-Module Thesis Execution Hub'}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {project.thesisTitle} · <span className="text-white font-semibold">{project.student}</span>
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {project.tokenStandards.map((std) => (
                <span
                  key={std}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 border border-white/10"
                >
                  {std}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 min-w-[260px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {lang === 'vi' ? 'TIẾN ĐỘ TỔNG THỂ' : 'OVERALL COMPLETION'}
              </span>
              <button
                onClick={() => loadProgress()}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition"
                title="Refresh live status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl font-extrabold tabular-nums text-teal-400">
                {project.overallProgress}%
              </span>
              <span className="text-xs text-slate-300 font-semibold">
                ({project.completedModules}/{project.totalModules} Modules)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(project.overallProgress, 8)}%` }}
              />
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-xs">
              <span className="text-slate-300">
                {lang === 'vi' ? 'Xem trước Sàn Xe DB thật:' : 'Preview Live DB Fleet:'}
              </span>
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-1 font-bold text-teal-300 hover:text-teal-200"
              >
                <span>Marketplace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Live Infrastructure Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              {lang === 'vi' ? 'CƠ SỞ DỮ LIỆU OFF-CHAIN' : 'OFF-CHAIN DATABASE'}
            </span>
            <Database className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
            12 / 12 {lang === 'vi' ? 'Bảng Hoạt động' : 'Active Tables'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {infrastructure.database.engine} · <strong className="text-slate-700">{totalRows}</strong>{' '}
            {lang === 'vi' ? 'bản ghi thực tế' : 'live rows'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              {lang === 'vi' ? 'KHO MÃ NGUỒN GITHUB' : 'GIT & GITHUB REPOSITORY'}
            </span>
            <GitBranch className="w-4 h-4 text-brand-blue" />
          </div>
          <div className="text-lg font-extrabold text-slate-900 truncate">
            {infrastructure.git.remoteUrl
              ? infrastructure.git.remoteUrl.replace('https://github.com/', '')
              : lang === 'vi'
              ? 'Sẵn sàng gắn link GitHub'
              : 'Ready for GitHub Remote URL'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Branch: <code className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700">{infrastructure.git.branch}</code> ·{' '}
            {infrastructure.git.commits.length} {lang === 'vi' ? 'commits đã lưu' : 'commits recorded'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              {lang === 'vi' ? 'MẠNG BLOCKCHAIN EVM' : 'EVM BLOCKCHAIN NODE'}
            </span>
            <Cpu className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-900">
            {infrastructure.blockchain.connected
              ? `Connected (Chain ID: ${infrastructure.blockchain.chainId})`
              : lang === 'vi'
              ? 'Triển khai tại Module 3'
              : 'Scheduled for Module 3'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            RPC: <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{infrastructure.blockchain.rpcUrl}</code>
          </p>
        </div>
      </div>

      {/* 8 Modules Roadmap Grid */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-blue" />
              <span>
                {lang === 'vi'
                  ? 'Chi tiết 8 Module Xây dựng & Đẩy lên GitHub'
                  : '8 Modular Deliverables & GitHub Push Milestones'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'vi'
                ? 'Mỗi module hoàn thiện đều được kiểm thử trên Web thật, cập nhật tiến độ tại đây và push commit riêng lên GitHub.'
                : 'Every completed module is verified live in the browser, updated here, and pushed as an atomic commit to GitHub.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {modules.map((mod) => {
            const isDone = mod.status === 'completed';
            const isNext = mod.status === 'next';
            const deliverables = lang === 'vi' ? mod.deliverablesVi : mod.deliverablesEn;

            return (
              <div
                key={mod.id}
                className={`rounded-2xl border p-5 transition ${
                  isDone
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : isNext
                    ? 'bg-blue-50/40 border-blue-200 ring-1 ring-blue-200'
                    : 'bg-slate-50/50 border-slate-200/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-navy-900 text-white">
                        {mod.code}
                      </span>
                      {isDone && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {lang === 'vi' ? 'Hoàn thành (100%)' : 'Completed (100%)'}
                        </span>
                      )}
                      {isNext && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                          <Clock className="w-3.5 h-3.5" />
                          {lang === 'vi' ? 'Chuẩn bị thực hiện' : 'Up Next'}
                        </span>
                      )}
                      {!isDone && !isNext && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">
                          <CircleDashed className="w-3.5 h-3.5" />
                          {lang === 'vi' ? 'Kế hoạch' : 'Planned'}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      {lang === 'vi' ? mod.titleVi : mod.titleEn}
                    </h3>
                  </div>
                </div>

                <ul className="space-y-1.5 text-xs text-slate-600 mb-3.5">
                  {deliverables.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${isDone ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {(mod.apis.length > 0 || mod.contracts.length > 0) && (
                  <div className="pt-3 border-t border-slate-200/70 flex flex-wrap gap-1.5">
                    {mod.apis.map((api) => (
                      <code
                        key={api}
                        className="text-[11px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold"
                      >
                        {api}
                      </code>
                    ))}
                    {mod.contracts.map((c) => (
                      <code
                        key={c}
                        className="text-[11px] px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 font-semibold"
                      >
                        ⛓ {c}
                      </code>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live 12-Table Database Inspector + Git History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
          <h3 className="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>
              {lang === 'vi'
                ? 'Kiểm tra Trực tiếp 12 Bảng Cơ sở dữ liệu (Chương 5.3.2)'
                : 'Live 12-Table Schema Inspector (Thesis Section 5.3.2)'}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            {lang === 'vi'
              ? 'Số lượng bản ghi đọc trực tiếp theo thời gian thực từ Prisma SQLite (tương thích 100% PostgreSQL).'
              : 'Real-time row counts queried directly from Prisma ORM.'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {infrastructure.database.tables.map((tb) => (
              <div
                key={tb.name}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{tb.ref}</span>
                  <span className="text-xs font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 tabular-nums">
                    {tb.count}
                  </span>
                </div>
                <code className="text-xs font-bold text-slate-800 truncate mt-1.5" title={tb.name}>
                  {tb.name}
                </code>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-brand-blue" />
              <span>
                {lang === 'vi' ? 'Lịch sử Commit Git Thực tế' : 'Live Git Commit Log'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {infrastructure.git.remoteUrl
                ? `Remote: ${infrastructure.git.remoteUrl}`
                : lang === 'vi'
                ? 'Đang chờ bạn gửi URL repo GitHub trống để liên kết origin & push.'
                : 'Waiting for your empty GitHub repo URL to link origin & push.'}
            </p>

            {infrastructure.git.commits.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                {lang === 'vi' ? 'Đang chuẩn bị tạo commit đầu tiên cho Module 0...' : 'Preparing initial commit for Module 0...'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {infrastructure.git.commits.map((c) => (
                  <div
                    key={c.hash}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{c.subject}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{c.relativeTime}</p>
                    </div>
                    <code className="text-[11px] font-bold px-2 py-0.5 rounded bg-navy-900 text-teal-300 shrink-0">
                      {c.hash}
                    </code>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
              <Code2 className="w-4 h-4 text-teal-600" />
              <span>
                {lang === 'vi'
                  ? `Đã kích hoạt ${skills.length} kỹ năng từ agentic-awesome-skills:`
                  : `${skills.length} active skills installed in .agents/skills/:`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((sk) => (
                <span
                  key={sk.name}
                  title={sk.roleVi}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200"
                >
                  {sk.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
