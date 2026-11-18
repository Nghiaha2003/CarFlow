import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  PieChart,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Wallet,
} from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function InvestmentsPage() {
  const { user, login } = useAuth();
  const { lang } = useLanguage();

  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadPortfolio = useCallback(async (signal) => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await apiClient('/api/v1/investments/portfolio', { signal });
      if (!signal?.aborted) {
        setPortfolio(res);
      }
    } catch (err) {
      if (err.name !== 'AbortError' && !signal?.aborted) {
        setFeedback({ type: 'error', text: err.message });
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();
    loadPortfolio(controller.signal);
    return () => controller.abort();
  }, [loadPortfolio]);

  const handleWithdrawEarnings = async () => {
    setFeedback(null);
    setClaiming(true);
    try {
      const res = await apiClient('/api/v1/investments/claim-yield', {
        method: 'POST',
      });
      setFeedback({
        type: 'success',
        text: `${res.message} · Tx: ${res.txHashes?.[0]?.slice(0, 18) || ''}...`,
      });
      await loadPortfolio();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setClaiming(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm">
        <Wallet className="w-10 h-10 text-teal-600 mx-auto mb-3" />
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">
          {lang === 'vi' ? 'Đăng nhập để xem Danh mục & Rút Cổ tức ERC-4626' : 'Sign In to View Portfolio & Yield'}
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          {lang === 'vi'
            ? 'Tài khoản mẫu Nguyễn Minh Quân (INVESTOR) đang sở hữu cổ phần đội xe và có sẵn lợi tức chờ rút từ hợp đồng DividendVault.'
            : 'Demo Investor account has active ERC-3643 vehicle positions and live claimable ERC-4626 dividends.'}
        </p>
        <button
          type="button"
          onClick={() => login('investor@carflow.vn', 'CarFlow@2026')}
          className="px-5 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold transition"
        >
          {lang === 'vi'
            ? 'Đăng nhập nhanh: Nguyễn Minh Quân (INVESTOR)'
            : '1-Click Sign In as Demo Investor'}
        </button>
      </div>
    );
  }

  if (loading && !portfolio) {
    return <div className="h-96 rounded-3xl bg-white border border-slate-200 animate-pulse" />;
  }

  const summary = portfolio?.summary || {
    totalInvestedUsd: 0,
    totalClaimedUsd: 0,
    totalClaimableUsd: 0,
    activePositions: 0,
  };
  const pools = portfolio?.pools || [];
  const positions = portfolio?.positions || [];

  const poolBarColors = ['bg-teal-600', 'bg-blue-600', 'bg-amber-500'];

  return (
    <div className="space-y-7">
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

      {/* Top Layout matching Investments Prototype (image35.jpeg) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">
        {/* Left 8 Cols: Featured Yield Pools + Active Positions */}
        <div className="xl:col-span-8 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-amber-500" />
              <h1 className="text-xl font-extrabold text-slate-900">
                {lang === 'vi' ? 'Các Bể Khai thác Lợi tức Đội xe (Featured Yield Pools)' : 'Featured Yield Pools'}
              </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pools.map((p, idx) => (
                <div
                  key={p.segment}
                  className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm flex flex-col justify-between space-y-5"
                >
                  <div>
                    <div className={`w-12 h-1.5 rounded-full ${poolBarColors[idx % 3]} mb-4`} />
                    <h3 className="text-lg font-extrabold text-slate-900 leading-snug">{p.title}</h3>
                    <div className="mt-4">
                      <div className="flex items-baseline justify-between text-xs font-bold">
                        <span className="text-slate-400 uppercase">EST. YIELD</span>
                        <span className="text-teal-700 text-sm font-extrabold tabular-nums">
                          {p.avgApr}% APR
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${poolBarColors[idx % 3]}`}
                          style={{ width: `${Math.min(100, p.avgApr * 6)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-3">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">LIQUIDITY</div>
                        <div className="text-base font-extrabold text-slate-900 tabular-nums">
                          ${p.liquidity.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">VEHICLES</div>
                        <div className="text-base font-extrabold text-slate-900 tabular-nums">
                          {p.vehicleCount}
                        </div>
                      </div>
                    </div>
                    <Link
                      to="/marketplace"
                      className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-extrabold uppercase tracking-wider transition"
                    >
                      <span>OPEN POOL</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Itemized ERC-3643 Holdings & ERC-4626 Vaults */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-slate-900 mb-4">
              {lang === 'vi'
                ? `Chi tiết Vị thế Cổ phần Đang nắm giữ (${positions.length})`
                : `Active ERC-3643 Share Positions (${positions.length})`}
            </h2>
            {positions.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl text-xs text-slate-500">
                {lang === 'vi'
                  ? 'Bạn chưa sở hữu cổ phần phương tiện nào. Hãy truy cập Sàn Giao dịch để đầu tư!'
                  : 'No active positions yet. Visit the Marketplace to invest in ERC-3643 vehicle shares!'}
              </div>
            ) : (
              <div className="space-y-3">
                {positions.map((pos) => (
                  <div
                    key={pos.holdingId}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-navy-900 text-teal-300">
                          {pos.tokenSymbol}
                        </span>
                        <Link
                          to={`/marketplace/${pos.assetId}`}
                          className="text-sm font-extrabold text-slate-900 hover:text-brand-blue"
                        >
                          {pos.vehicleName}
                        </Link>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Sở hữu: <strong>{pos.tokenBalance.toLocaleString()}</strong> /{' '}
                        {pos.totalSupply.toLocaleString()} cổ phần ({pos.ownershipPct}%) · Vault ERC-4626:{' '}
                        <code className="font-mono text-[11px]">
                          {pos.vaultAddress?.slice(0, 10)}...
                        </code>
                      </p>
                    </div>

                    <div className="flex items-center gap-5 shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase text-slate-400">INVESTED</div>
                        <div className="text-sm font-extrabold text-slate-900 tabular-nums">
                          ${pos.investedUsd.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase text-teal-600">CLAIMABLE</div>
                        <div className="text-sm font-extrabold text-teal-700 tabular-nums">
                          +${pos.claimableUsd.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Cols: My Portfolio Summary Card matching image35.jpeg */}
        <div className="xl:col-span-4 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-extrabold text-slate-900">My Portfolio</h2>
          </div>

          <div className="text-center py-2">
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              TOTAL INVESTED
            </div>
            <div className="text-4xl font-black text-slate-900 mt-1 tabular-nums">
              ${summary.totalInvestedUsd.toLocaleString()}
            </div>
            <div className="text-xs font-bold text-teal-600 mt-1.5 tabular-nums">
              ↗ +${(summary.totalClaimedUsd + summary.totalClaimableUsd).toFixed(2)} Total Yield
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="px-4 py-3 rounded-xl bg-slate-50 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Claimed earnings</span>
              <strong className="text-slate-900 font-extrabold tabular-nums">
                ${summary.totalClaimedUsd.toFixed(2)}
              </strong>
            </div>
            <div className="px-4 py-3 rounded-xl bg-slate-50 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Active positions</span>
              <strong className="text-slate-900 font-extrabold tabular-nums">
                {summary.activePositions} vehicles
              </strong>
            </div>
            <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <span className="text-emerald-800 font-bold">Claimable rewards (ERC-4626)</span>
              <strong className="text-emerald-700 font-extrabold text-sm tabular-nums">
                ${summary.totalClaimableUsd.toFixed(2)}
              </strong>
            </div>
          </div>

          <button
            type="button"
            disabled={claiming || summary.totalClaimableUsd <= 0}
            onClick={handleWithdrawEarnings}
            className="w-full py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white text-xs font-extrabold uppercase tracking-widest transition shadow-sm"
          >
            {claiming
              ? 'Claiming from DividendVault...'
              : lang === 'vi'
              ? 'RÚT CỔ TỨC VỀ VÍ (WITHDRAW EARNINGS)'
              : 'WITHDRAW EARNINGS'}
          </button>
        </div>
      </div>
    </div>
  );
}
