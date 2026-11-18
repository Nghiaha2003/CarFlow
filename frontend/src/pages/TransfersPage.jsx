import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeftRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function TransfersPage() {
  const { user, login } = useAuth();
  const { lang } = useLanguage();

  const [txs, setTxs] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assetTokenId, setAssetTokenId] = useState('');
  const [recipient, setRecipient] = useState('owner@carflow.vn');
  const [shareAmount, setShareAmount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadData = useCallback(async (signal) => {
    try {
      setLoading(true);
      const [txRes, mktRes] = await Promise.all([
        apiClient('/api/v1/marketplace/transactions', { signal }),
        apiClient('/api/v1/marketplace/assets', { signal }),
      ]);
      if (!signal?.aborted) {
        setTxs(txRes.transactions || []);
        const tokenized = (mktRes.assets || []).filter((a) => a.tokens?.[0]);
        setAssets(tokenized);
        if (tokenized[0]?.tokens?.[0]?.id) {
          setAssetTokenId((prev) => prev || tokenized[0].tokens[0].id);
        }
      }
    } catch {
      // ignore abort
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setBusy(true);
    try {
      const res = await apiClient('/api/v1/marketplace/transfer', {
        method: 'POST',
        body: JSON.stringify({
          assetTokenId,
          recipientEmailOrWallet: recipient,
          shareAmount: Number(shareAmount),
        }),
      });
      setFeedback({ type: 'success', text: `${res.message} · Tx: ${res.txHash}` });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg">
          MODULE 5 · ON-CHAIN TRANSACTION LEDGER & COMPLIANT P2P TRANSFERS
        </span>
        <h1 className="text-2xl font-extrabold text-slate-900 mt-2">
          {lang === 'vi'
            ? 'Lịch sử Giao dịch & Chuyển nhượng Tuân thủ ERC-3643'
            : 'On-Chain Ledger & Compliant ERC-3643 Transfers'}
        </h1>
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

      {/* P2P Compliant Transfer Box */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-brand-blue" />
            <span>
              {lang === 'vi'
                ? 'Chuyển nhượng Cổ phần Thứ cấp (Kiểm tra ONCHAINID tự động trên Smart Contract)'
                : 'Secondary P2P ERC-3643 Share Transfer'}
            </span>
          </h2>
          {!user && (
            <button
              type="button"
              onClick={() => login('investor@carflow.vn', 'CarFlow@2026')}
              className="px-3 py-1.5 rounded-xl bg-navy-900 text-white text-xs font-bold"
            >
              Đăng nhập mẫu Investor
            </button>
          )}
        </div>

        <form onSubmit={handleTransfer} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Token Phương tiện
            </label>
            <select
              value={assetTokenId}
              onChange={(e) => setAssetTokenId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
            >
              {assets.map((a) => (
                <option key={a.tokens[0].id} value={a.tokens[0].id}>
                  {a.tokens[0].tokenSymbol} — {a.vehicleName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Email hoặc Địa chỉ Ví Người nhận
            </label>
            <input
              type="text"
              required
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="owner@carflow.vn hoặc 0x..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Số lượng Cổ phần
            </label>
            <input
              type="number"
              min="1"
              required
              value={shareAmount}
              onChange={(e) => setShareAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold tabular-nums"
            />
          </div>
          <button
            type="submit"
            disabled={!user || busy}
            className="py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-extrabold uppercase tracking-wider transition flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{busy ? 'Đang kiểm tra KYC...' : 'Chuyển nhượng ERC-3643'}</span>
          </button>
        </form>
      </div>

      {/* Transactions Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm overflow-x-auto">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 mb-4">
          {lang === 'vi'
            ? `Sổ cái Giao dịch Token (${txs.length} giao dịch)`
            : `Blockchain Token Transaction History (${txs.length})`}
        </h3>
        {loading ? (
          <div className="h-40 animate-pulse bg-slate-50 rounded-2xl" />
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider">
                <th className="py-3 pr-4">Loại</th>
                <th className="py-3 pr-4">Phương tiện</th>
                <th className="py-3 pr-4">Từ → Đến</th>
                <th className="py-3 pr-4">Số lượng</th>
                <th className="py-3 pr-4">Giá trị</th>
                <th className="py-3">Mã Giao dịch Blockchain (tx_hash)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {txs.map((tx) => (
                <tr key={tx.id}>
                  <td className="py-3 pr-4">
                    <span className="px-2 py-0.5 rounded font-bold uppercase bg-slate-100 text-slate-800">
                      {tx.transactionType}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-bold text-slate-800">
                    {tx.assetToken?.asset?.assetCode}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">
                    {tx.fromUser?.fullName || 'Treasury / Vault'} → {tx.toUser?.fullName}
                  </td>
                  <td className="py-3 pr-4 font-bold tabular-nums">
                    {tx.tokenAmount.toLocaleString()} {tx.assetToken?.tokenSymbol}
                  </td>
                  <td className="py-3 pr-4 font-extrabold text-teal-700 tabular-nums">
                    ${tx.totalValue.toLocaleString()}
                  </td>
                  <td className="py-3 font-mono text-[11px] text-slate-500">
                    {tx.blockchainTxHash
                      ? `${tx.blockchainTxHash.slice(0, 14)}...${tx.blockchainTxHash.slice(-8)}`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
