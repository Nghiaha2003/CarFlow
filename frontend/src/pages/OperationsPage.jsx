import React, { useEffect, useState, useCallback } from 'react';
import { Wrench, PlusCircle, CheckCircle2, AlertCircle, Gauge } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function OperationsPage() {
  const { user, login } = useAuth();
  const { lang } = useLanguage();

  const [records, setRecords] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [assetId, setAssetId] = useState('');
  const [operationStatus, setOperationStatus] = useState('COMPLETED_SHIFT');
  const [mileage, setMileage] = useState('315');
  const [revenue, setRevenue] = useState('340');
  const [cost, setCost] = useState('55');
  const [note, setNote] = useState('Khai thác ca ngày hợp đồng đưa đón chuyên gia + phí sạc trạm 150kW.');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadRecords = useCallback(async (signal) => {
    try {
      setLoading(true);
      const res = await apiClient('/api/v1/operation/records', { signal });
      if (!signal?.aborted) {
        setRecords(res.records || []);
        setAssets(res.assets || []);
        const firstTokenized = (res.assets || []).find((a) => a.tokenizationStatus === 'TOKENIZED');
        if (firstTokenized) {
          setAssetId((prev) => prev || firstTokenized.id);
        } else if (res.assets?.[0]) {
          setAssetId((prev) => prev || res.assets[0].id);
        }
      }
    } catch {
      // ignore
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadRecords(controller.signal);
    return () => controller.abort();
  }, [loadRecords]);

  const canLogOps = user && ['OPERATOR', 'ADMIN', 'OWNER'].includes(user.role);
  const previewNet = Number(revenue || 0) - Number(cost || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      const res = await apiClient('/api/v1/operation/records', {
        method: 'POST',
        body: JSON.stringify({
          asset_id: assetId,
          operation_status: operationStatus,
          mileage: Number(mileage),
          revenue: Number(revenue),
          cost: Number(cost),
          note,
        }),
      });
      setFeedback({
        type: 'success',
        text: `${res.message}${
          res.data?.vault_tx_hash ? ` · Vault Tx: ${res.data.vault_tx_hash.slice(0, 18)}...` : ''
        }`,
      });
      await loadRecords();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg">
            MODULE 6 · DAILY FLEET OPERATIONS & ERC-4626 REVENUE DEPOSIT (API-09)
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-2">
            {lang === 'vi'
              ? 'Nhật ký Vận hành Đội xe & Phân phối Dòng tiền Thực tế'
              : 'Fleet Operations & Live ERC-4626 Revenue Sync'}
          </h1>
        </div>

        {(!user || !canLogOps) && (
          <button
            type="button"
            onClick={() => login('operator@carflow.vn', 'CarFlow@2026')}
            className="px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold shrink-0"
          >
            {lang === 'vi'
              ? 'Đăng nhập nhanh: Lê Hoàng Nam (OPERATOR)'
              : '1-Click Sign In as Demo Operator'}
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-start gap-2.5 break-all ${
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Log Operation Shift Form (API-09) */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4 h-fit"
        >
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-teal-600" />
            <span>
              {lang === 'vi'
                ? 'Khai báo Ca Vận hành Hàng ngày (API-09)'
                : 'Record Daily Operation Shift (API-09)'}
            </span>
          </h2>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              {lang === 'vi' ? 'Phương tiện khai thác' : 'Vehicle'}
            </label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.assetCode} — {a.vehicleName} ({a.tokenizationStatus})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                {lang === 'vi' ? 'Quãng đường ca (km) *' : 'Shift Mileage (km) *'}
              </label>
              <input
                type="number"
                required
                min="1"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                {lang === 'vi' ? 'Trạng thái ca' : 'Shift Status'}
              </label>
              <select
                value={operationStatus}
                onChange={(e) => setOperationStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
              >
                <option value="COMPLETED_SHIFT">Hoàn tất ca chạy</option>
                <option value="CHARGING">Sạc pin / Tiếp nhiên liệu</option>
                <option value="MAINTENANCE">Bảo dưỡng định kỳ</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                {lang === 'vi' ? 'Doanh thu cuốc xe (USD) *' : 'Gross Revenue (USD) *'}
              </label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-emerald-700 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                {lang === 'vi' ? 'Chi phí sạc / cầu đường (USD) *' : 'Operating Cost (USD) *'}
              </label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-rose-700 tabular-nums"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between text-xs">
            <span className="font-bold text-teal-900">
              {lang === 'vi'
                ? 'Lợi nhuận ròng tự động nạp vào DividendVault:'
                : 'Net Yield auto-deposited to ERC-4626 Vault:'}
            </span>
            <strong className="text-sm font-extrabold text-teal-700 tabular-nums">
              ${previewNet.toFixed(2)}
            </strong>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              {lang === 'vi' ? 'Ghi chú vận hành' : 'Notes'}
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={!canLogOps || submitting}
            className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white text-xs font-extrabold uppercase tracking-wider transition"
          >
            {submitting
              ? 'Syncing Record & ERC-4626 Vault...'
              : lang === 'vi'
              ? 'Lưu Nhật ký & Nạp Lợi nhuận vào Vault (API-09)'
              : 'Save Log & Deposit Revenue to Vault (API-09)'}
          </button>
        </form>

        {/* Right 7 Cols: Operation Records Feed */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-brand-blue" />
            <span>
              {lang === 'vi'
                ? `Lịch sử Vận hành Thực tế (${records.length} bản ghi)`
                : `Operational Shift Logs (${records.length})`}
            </span>
          </h3>

          {loading ? (
            <div className="h-48 rounded-2xl bg-slate-50 animate-pulse" />
          ) : (
            <div className="space-y-3">
              {records.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-navy-900 text-teal-300">
                        {rec.asset?.assetCode}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {rec.asset?.vehicleName}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {new Date(rec.recordedAt).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div className="p-2 rounded-xl bg-white border border-slate-200/70 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-bold tabular-nums">{rec.mileage} km</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                      <span className="text-slate-400">Doanh thu: </span>
                      <strong className="text-slate-900 tabular-nums">${rec.revenue.toFixed(2)}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200/80">
                      <span className="text-emerald-800">Ròng: </span>
                      <strong className="text-emerald-700 tabular-nums">
                        +${rec.netProfit.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  {rec.note && <p className="text-xs text-slate-600">{rec.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
