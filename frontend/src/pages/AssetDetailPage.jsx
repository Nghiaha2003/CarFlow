import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Cpu,
  FileCheck2,
  Wallet,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function AssetDetailPage() {
  const { id } = useParams();
  const { user, login } = useAuth();
  const { lang } = useLanguage();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shareAmount, setShareAmount] = useState(50);
  const [investing, setInvesting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadDetail = useCallback(async (signal) => {
    try {
      setLoading(true);
      const res = await apiClient(`/api/v1/marketplace/assets/${id}`, { signal });
      if (!signal?.aborted) {
        setDetail(res);
      }
    } catch (err) {
      if (err.name !== 'AbortError' && !signal?.aborted) {
        setFeedback({ type: 'error', text: err.message });
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    loadDetail(controller.signal);
    return () => controller.abort();
  }, [loadDetail]);

  const handleInvest = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setInvesting(true);
    try {
      const res = await apiClient('/api/v1/marketplace/invest', {
        method: 'POST',
        body: JSON.stringify({
          asset_id: id,
          share_amount: Number(shareAmount),
        }),
      });
      setFeedback({
        type: 'success',
        text: `${res.message} · Blockchain Tx: ${res.data.blockchain_tx_hash}`,
      });
      await loadDetail();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setInvesting(false);
    }
  };

  if (loading && !detail) {
    return <div className="h-96 rounded-3xl bg-white border border-slate-200 animate-pulse" />;
  }

  const asset = detail?.asset;
  const onchain = detail?.onchainInfo;
  if (!asset) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center">
        <p className="text-sm font-bold text-slate-700">Vehicle not found</p>
      </div>
    );
  }

  const token = asset.tokens?.[0];
  const unitPrice = token?.unitPrice || 10;
  const fundedPct = token
    ? Math.round(((token.totalSupply - token.availableSupply) / token.totalSupply) * 100)
    : 0;
  const myHolding = token?.holdings?.find((h) => h.investor?.id === user?.id);

  return (
    <div className="space-y-6">
      <Link
        to="/marketplace"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{lang === 'vi' ? 'Quay lại Sàn Giao dịch' : 'Back to Marketplace'}</span>
      </Link>

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Left 7 Cols: Vehicle Specs, On-chain Registry Proof & IPFS Docs (Fig 5.18) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm">
            <div className="relative h-64 sm:h-80 bg-slate-200">
              {asset.imageUrl && (
                <img src={asset.imageUrl} alt={asset.vehicleName} className="w-full h-full object-cover" />
              )}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-3 py-1 rounded-full bg-navy-900/90 text-teal-300 text-xs font-extrabold">
                  {asset.assetCode}
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-extrabold">
                  {asset.tokenizationStatus}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900">{asset.vehicleName}</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    {asset.location} · {asset.manufactureYear} · Biển số: <strong>{asset.licensePlate}</strong> · VIN:{' '}
                    <code className="font-mono">{asset.chassisNumber}</code>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase text-slate-400">TARGET YIELD</div>
                  <div className="text-2xl font-extrabold text-teal-600 tabular-nums">
                    {asset.targetApr}% APR
                  </div>
                </div>
              </div>

              {asset.description && (
                <p className="text-sm text-slate-600 leading-relaxed">{asset.description}</p>
              )}

              {/* On-chain Registry Verification Box */}
              <div className="rounded-2xl bg-navy-900 text-white p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-teal-400">
                  <Cpu className="w-4 h-4" />
                  <span>
                    {lang === 'vi'
                      ? 'DỮ LIỆU ĐỐI CHIẾU TRỰC TIẾP TỪ CHUỖI KHỐI EVM'
                      : 'LIVE ON-CHAIN EVM SMART CONTRACT PROOFS'}
                  </span>
                </div>
                {token ? (
                  <div className="space-y-1.5 text-xs font-mono text-slate-300 break-all">
                    <div>
                      <span className="text-slate-400">ERC-3643 ShareToken:</span> {token.contractAddress}
                    </div>
                    <div>
                      <span className="text-slate-400">ERC-4626 DividendVault:</span> {token.vaultAddress}
                    </div>
                    {onchain && (
                      <div>
                        <span className="text-slate-400">Registry Verified VIN:</span> {onchain.vin} · IPFS:{' '}
                        {onchain.ipfsMetadataHash}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-amber-300">
                    {lang === 'vi'
                      ? 'Phương tiện đang chờ Admin phê duyệt để triển khai hợp đồng ERC-3643 trên chuỗi khối.'
                      : 'Awaiting Admin approval to deploy ERC-3643 contracts.'}
                  </p>
                )}
              </div>

              {/* IPFS Legal Proofs */}
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-teal-600" />
                  <span>IPFS Verified Legal Documents ({asset.documents?.length || 0})</span>
                </h3>
                {asset.documents?.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800">{doc.fileName}</span>
                      <div className="font-mono text-[11px] text-slate-500 truncate">
                        ipfs://{doc.ipfsCid}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] shrink-0">
                      SHA-256 VERIFIED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Investment Structure & Buy ERC-3643 Shares Panel (Fig 5.18 & API-08) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900">
                {lang === 'vi' ? 'Cấu trúc Gọi vốn RWA (ERC-3643)' : 'RWA Investment Structure'}
              </h2>
              <ShieldCheck className="w-5 h-5 text-teal-600" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-bold uppercase text-slate-400">ASSET VALUATION</div>
                <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                  ${asset.estimatedValue.toLocaleString()}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-bold uppercase text-slate-400">SHARE UNIT PRICE</div>
                <div className="text-lg font-extrabold text-teal-700 tabular-nums">${unitPrice}.00</div>
              </div>
            </div>

            {token && (
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-500">
                    {lang === 'vi' ? 'Đã phân bổ' : 'Allocated'}:{' '}
                    {(token.totalSupply - token.availableSupply).toLocaleString()} /{' '}
                    {token.totalSupply.toLocaleString()} {token.tokenSymbol}
                  </span>
                  <span className="text-teal-700 tabular-nums">{fundedPct}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-teal-600 rounded-full" style={{ width: `${fundedPct}%` }} />
                </div>
                <div className="text-[11px] text-slate-500 mt-1.5">
                  {lang === 'vi' ? 'Cổ phần còn lại khả dụng:' : 'Available shares:'}{' '}
                  <strong className="text-slate-800">{token.availableSupply.toLocaleString()}</strong>
                </div>
              </div>
            )}

            {myHolding && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-900">
                  {lang === 'vi' ? 'Số cổ phần bạn đang sở hữu:' : 'Your current position:'}
                </span>
                <span className="font-extrabold text-emerald-700 text-sm tabular-nums">
                  {myHolding.tokenBalance.toLocaleString()} {token?.tokenSymbol}
                </span>
              </div>
            )}

            {!user ? (
              <div className="pt-2 space-y-3">
                <p className="text-xs text-slate-500">
                  {lang === 'vi'
                    ? 'Đăng nhập tài khoản Nhà đầu tư đã xác thực KYC để mua cổ phần ERC-3643:'
                    : 'Sign in with a KYC-verified Investor account to purchase shares:'}
                </p>
                <button
                  type="button"
                  onClick={() => login('investor@carflow.vn', 'CarFlow@2026')}
                  className="w-full py-3 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-xs font-extrabold uppercase tracking-wider transition"
                >
                  {lang === 'vi'
                    ? 'Đăng nhập nhanh: Nguyễn Minh Quân (INVESTOR - KYC VERIFIED)'
                    : '1-Click Sign In as Verified Investor'}
                </button>
              </div>
            ) : token && token.availableSupply > 0 ? (
              <form onSubmit={handleInvest} className="space-y-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'vi' ? 'Số lượng cổ phần muốn đầu tư' : 'Shares to Purchase'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={token.availableSupply}
                    required
                    value={shareAmount}
                    onChange={(e) => setShareAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-base font-extrabold tabular-nums focus:outline-none focus:border-teal-600"
                  />
                  <div className="flex gap-2 mt-2">
                    {[10, 50, 100, 250].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setShareAmount(Math.min(preset, token.availableSupply))}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{lang === 'vi' ? 'Tổng giá trị đầu tư:' : 'Total Investment:'}</span>
                    <strong className="text-slate-900 tabular-nums">
                      ${(Number(shareAmount || 0) * unitPrice).toLocaleString()}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
                      {lang === 'vi' ? 'Lợi tức dự kiến / năm:' : 'Est. Annual Yield:'}
                    </span>
                    <strong className="text-teal-700 tabular-nums">
                      +$
                      {(
                        ((Number(shareAmount || 0) * unitPrice) * asset.targetApr) /
                        100
                      ).toFixed(2)}
                    </strong>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={investing}
                  className="w-full py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-extrabold uppercase tracking-wider transition flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  <span>
                    {investing
                      ? 'Executing ERC-3643 Transfer on EVM...'
                      : lang === 'vi'
                      ? 'Xác nhận Đầu tư Cổ phần On-chain (API-08)'
                      : 'Confirm On-Chain Share Purchase (API-08)'}
                  </span>
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
