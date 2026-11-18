import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileBarChart2,
} from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function ReportsAuditPage() {
  const { user, login } = useAuth();
  const { lang } = useLanguage();

  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('asset_summary');
  const [segment, setSegment] = useState('ALL');
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadAudit = useCallback(async (signal) => {
    try {
      setLoading(true);
      const res = await apiClient('/api/v1/reports/audit', { signal });
      if (!signal?.aborted) {
        setAuditData(res);
      }
    } catch {
      // ignore
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadAudit(controller.signal);
    return () => controller.abort();
  }, [loadAudit]);

  const handleExportReport = async () => {
    setFeedback(null);
    setExporting(true);
    try {
      const res = await apiClient('/api/v1/reports/generate', {
        method: 'POST',
        body: JSON.stringify({ report_type: reportType, segment }),
      });

      // Trigger instant CSV download in browser
      const rows = res.rows || [];
      if (rows.length > 0) {
        const headers = Object.keys(rows[0]);
        const csvLines = [
          headers.join(','),
          ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
        ];
        const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CarFlow_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setFeedback({ type: 'success', text: res.message });
      await loadAudit();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg">
            MODULE 7 · REPORT GALLERY & ON-CHAIN / OFF-CHAIN CRYPTOGRAPHIC AUDIT
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-2">
            {lang === 'vi'
              ? 'Báo cáo Thống kê & Kiểm toán Đối chiếu Chuỗi khối'
              : 'Report Gallery & On-Chain Consistency Verifier'}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => loadAudit()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{lang === 'vi' ? 'Đối chiếu lại On-chain' : 'Re-verify On-Chain State'}</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-start gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Report Export Builder (writes to report_logs Bảng 5.17) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <FileBarChart2 className="w-4 h-4 text-brand-blue" />
            <span>
              {lang === 'vi'
                ? 'Kết xuất Báo cáo CSV & Ghi vết bảng report_logs (Bảng 5.17)'
                : 'Generate Exportable CSV Report (report_logs)'}
            </span>
          </h2>
          {!user && (
            <button
              type="button"
              onClick={() => login('admin@carflow.vn', 'CarFlow@2026')}
              className="px-3 py-1.5 rounded-xl bg-navy-900 text-white text-xs font-bold"
            >
              Đăng nhập mẫu Admin
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Loại Báo cáo (report_type)
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
            >
              <option value="asset_summary">Tổng hợp Tài sản Phương tiện (asset_summary)</option>
              <option value="transaction_summary">Tổng hợp Giao dịch Token (transaction_summary)</option>
              <option value="operation_summary">Tổng hợp Vận hành & Lợi nhuận (operation_summary)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Điều kiện lọc Phân khúc
            </label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
            >
              <option value="ALL">Tất cả phân khúc (ALL)</option>
              <option value="EV">Xe điện (EV)</option>
              <option value="Luxury">Hạng sang (Luxury)</option>
              <option value="Logistics">Vận tải lạnh (Logistics)</option>
            </select>
          </div>

          <button
            type="button"
            disabled={!user || exporting}
            onClick={handleExportReport}
            className="py-2.5 px-4 rounded-xl bg-navy-900 hover:bg-navy-800 disabled:opacity-40 text-white text-xs font-extrabold uppercase tracking-wider transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Đang kết xuất...' : 'Tạo & Tải Báo cáo CSV'}</span>
          </button>
        </div>
      </div>

      {/* Live On-Chain vs Off-Chain State Verifier (Bảng 5.19) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm overflow-x-auto">
        <h3 className="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>
            {lang === 'vi'
              ? 'Đối chiếu Tính Toàn vẹn Off-chain (CSDL) ↔ On-chain (EVM Smart Contract)'
              : 'Off-Chain DB vs On-Chain Smart Contract Verification'}
          </span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          {lang === 'vi'
            ? 'Truy vấn trực tiếp VehicleIdentityRegistry và VehicleShareToken trên cổng EVM 8545 để kiểm chứng số khung VIN & tổng cung.'
            : 'Queries VehicleIdentityRegistry and VehicleShareToken live on EVM port 8545.'}
        </p>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider">
              <th className="py-3 pr-4">Mã Xe</th>
              <th className="py-3 pr-4">VIN (Off-chain / On-chain)</th>
              <th className="py-3 pr-4">Tổng Cung ERC-3643</th>
              <th className="py-3 pr-4">IPFS CID</th>
              <th className="py-3 text-right">Kết quả Đối chiếu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(auditData?.verifications || []).map((v) => (
              <tr key={v.assetCode}>
                <td className="py-3.5 pr-4 font-extrabold text-slate-900">{v.assetCode}</td>
                <td className="py-3.5 pr-4 font-mono text-[11px] text-slate-600">
                  {v.offchainVin} / <span className="text-teal-700">{v.onchainVin || '...'}</span>
                </td>
                <td className="py-3.5 pr-4 font-bold tabular-nums">
                  {v.offchainSupply.toLocaleString()} /{' '}
                  <span className="text-teal-700">{v.onchainSupply?.toLocaleString() || '...'}</span>
                </td>
                <td className="py-3.5 pr-4 font-mono text-[11px] text-slate-500">
                  {v.ipfsCid ? `${v.ipfsCid.slice(0, 18)}...` : '-'}
                </td>
                <td className="py-3.5 text-right">
                  <span
                    className={`px-2.5 py-1 rounded-full font-extrabold text-[11px] ${
                      v.synced
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {v.synced ? '✓ KHỚP 100% ON-CHAIN' : 'SYNCING'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audit Logs Table (Bảng 5.18) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm overflow-x-auto">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 mb-3">
          {lang === 'vi'
            ? `Nhật ký Kiểm toán Hệ thống (audit_logs — ${auditData?.auditLogs?.length || 0} sự kiện gần nhất)`
            : `Immutable System Audit Trail (${auditData?.auditLogs?.length || 0} events)`}
        </h3>
        <div className="space-y-2">
          {(auditData?.auditLogs || []).slice(0, 12).map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="min-w-0">
                <span className="font-extrabold text-navy-900 mr-2">{log.action}</span>
                <span className="text-slate-500">bởi {log.actor?.fullName}</span>
                {log.newValue && (
                  <div className="font-mono text-[11px] text-slate-500 truncate mt-0.5">
                    {log.newValue}
                  </div>
                )}
              </div>
              <span className="text-[11px] text-slate-400 shrink-0">
                {new Date(log.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
