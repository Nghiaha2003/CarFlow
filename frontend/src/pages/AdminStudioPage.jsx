import React, { useEffect, useState, useCallback } from 'react';
import {
  Zap,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Activity,
  Lock,
} from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function AdminStudioPage() {
  const { user, login } = useAuth();
  const { lang } = useLanguage();

  const [tab, setTab] = useState('onboarding'); // 'onboarding' | 'maintenance' | 'kyc'
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Maintenance Proof form (API-10)
  const [maintAssetId, setMaintAssetId] = useState('');
  const [garageName, setGarageName] = useState('Gara BKU Auto Service');
  const [invoiceCid, setInvoiceCid] = useState('bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku');

  // Operator assignment form
  const [assignAssetId, setAssignAssetId] = useState('');
  const [assignOperatorId, setAssignOperatorId] = useState('');

  const loadOverview = useCallback(async (signal) => {
    if (!user || user.role !== 'ADMIN') {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await apiClient('/api/v1/admin/overview', { signal });
      if (!signal?.aborted) {
        setOverview(res);
        const firstTokenized = res.assets?.find((a) => a.tokenizationStatus === 'TOKENIZED');
        if (firstTokenized) {
          setMaintAssetId((prev) => prev || firstTokenized.id);
          setAssignAssetId((prev) => prev || firstTokenized.id);
        }
        const firstOp = res.users?.find((u) => u.role === 'OPERATOR');
        if (firstOp) {
          setAssignOperatorId((prev) => prev || firstOp.id);
        }
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
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();
    loadOverview(controller.signal);
    return () => controller.abort();
  }, [loadOverview]);

  const handleQuickAdminLogin = async () => {
    try {
      await login('admin@carflow.vn', 'CarFlow@2026');
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm">
        <Lock className="w-10 h-10 text-navy-900 mx-auto mb-3" />
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">
          {lang === 'vi' ? 'Không gian Đặc quyền Quản trị viên (ADMIN)' : 'System Admin Access Required'}
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          {lang === 'vi'
            ? 'Admin Studio được bảo vệ bởi RBAC Middleware — chỉ tài khoản ADMIN mới được ký lệnh phát hành hợp đồng ERC-3643 & duyệt KYC ONCHAINID.'
            : 'Admin Studio is guarded by strict RBAC — only ADMIN can deploy ERC-3643 contracts & whitelist KYC identities.'}
        </p>
        <button
          type="button"
          onClick={handleQuickAdminLogin}
          className="px-5 py-3 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-sm font-bold transition"
        >
          {lang === 'vi' ? 'Đăng nhập nhanh: Hà Đình Nghĩa (ADMIN)' : '1-Click Sign In as System Admin'}
        </button>
      </div>
    );
  }

  const handleApproveTokenization = async (asset, decision = 'APPROVE') => {
    setFeedback(null);
    setBusyId(asset.id);
    try {
      const res = await apiClient('/api/v1/admin/tokenization/approve', {
        method: 'POST',
        body: JSON.stringify({
          asset_id: asset.id,
          decision,
          total_shares: Math.round(asset.estimatedValue / 10),
          unit_price: 10,
        }),
      });
      setFeedback({
        type: 'success',
        text:
          decision === 'APPROVE'
            ? `${res.message} · ShareToken: ${res.data.share_token_address.slice(0, 10)}... · Vault: ${res.data.dividend_vault_address.slice(0, 10)}... · Tx: ${res.data.mint_tx_hash.slice(0, 14)}...`
            : res.message,
      });
      await loadOverview();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleVerifyKyc = async (u, approve = true) => {
    setFeedback(null);
    setBusyId(u.id);
    try {
      const res = await apiClient('/api/v1/admin/kyc/verify', {
        method: 'POST',
        body: JSON.stringify({ userId: u.id, approve }),
      });
      setFeedback({ type: 'success', text: `${res.message} (Tx: ${res.txHash.slice(0, 16)}...)` });
      await loadOverview();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleProveMaintenance = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setBusyId('maint');
    try {
      const res = await apiClient('/api/v1/admin/maintenance/approve', {
        method: 'POST',
        body: JSON.stringify({
          asset_id: maintAssetId,
          garage_name: garageName,
          invoice_cid: invoiceCid,
        }),
      });
      setFeedback({
        type: 'success',
        text: `${res.message} (Tx: ${res.blockchain_data.transaction_hash.slice(0, 18)}...)`,
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleAssignOperator = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setBusyId('assign');
    try {
      const res = await apiClient('/api/v1/admin/operators/assign', {
        method: 'POST',
        body: JSON.stringify({ assetId: assignAssetId, operatorId: assignOperatorId }),
      });
      setFeedback({ type: 'success', text: res.message });
      await loadOverview();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const pendingAssets = overview?.assets?.filter((a) => a.tokenizationStatus === 'PENDING_REVIEW') || [];
  const tokenizedAssets = overview?.assets?.filter((a) => a.tokenizationStatus === 'TOKENIZED') || [];
  const operators = overview?.users?.filter((u) => u.role === 'OPERATOR') || [];

  return (
    <div className="space-y-6">
      {/* Top Tab Bar matching Fig 5.19 */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 inline-flex flex-wrap gap-2 shadow-sm">
        <button
          type="button"
          onClick={() => setTab('onboarding')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wider uppercase transition ${
            tab === 'onboarding'
              ? 'bg-navy-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Zap className={`w-4 h-4 ${tab === 'onboarding' ? 'text-teal-400' : 'text-slate-400'}`} />
          <span>ASSET ONBOARDING ({pendingAssets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('maintenance')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wider uppercase transition ${
            tab === 'maintenance'
              ? 'bg-navy-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wrench className={`w-4 h-4 ${tab === 'maintenance' ? 'text-teal-400' : 'text-slate-400'}`} />
          <span>MAINTENANCE & OPERATORS</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('kyc')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wider uppercase transition ${
            tab === 'kyc'
              ? 'bg-navy-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className={`w-4 h-4 ${tab === 'kyc' ? 'text-teal-400' : 'text-slate-400'}`} />
          <span>KYC REVIEW ({overview?.users?.length || 0})</span>
        </button>
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

      {loading ? (
        <div className="h-80 rounded-3xl bg-white border border-slate-200 animate-pulse" />
      ) : tab === 'onboarding' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 8 cols: Pending Vehicle Tokenization Queue matching Fig 5.19 */}
          <div className="lg:col-span-8 space-y-5">
            {pendingAssets.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h3 className="text-base font-extrabold text-slate-900">
                  {lang === 'vi'
                    ? 'Tất cả hồ sơ xe chờ duyệt đã được Token hóa!'
                    : 'All pending vehicles have been tokenized on-chain!'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {lang === 'vi'
                    ? 'Bạn có thể sang mục "Hồ sơ Tài sản Xe" để khai báo thêm phương tiện mới và quay lại đây bấm đúc ERC-3643.'
                    : 'Declare a new vehicle in Vehicle Onboarding to test live ERC-3643 contract deployment.'}
                </p>
              </div>
            ) : (
              pendingAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xl font-extrabold text-slate-900">
                      New Vehicle Tokenization — {asset.assetCode}
                    </h2>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                      PENDING_REVIEW
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                      <div className="text-[10px] font-bold uppercase text-slate-400">VEHICLE MODEL</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{asset.vehicleName}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                      <div className="text-[10px] font-bold uppercase text-slate-400">VIN</div>
                      <div className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                        {asset.chassisNumber}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                      <div className="text-[10px] font-bold uppercase text-slate-400">YEAR & SEGMENT</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">
                        {asset.manufactureYear} · {asset.vehicleSegment}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                      <div className="text-[10px] font-bold uppercase text-slate-400">LICENSE PLATE</div>
                      <div className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                        {asset.licensePlate}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        PURCHASE VALUATION (USD)
                      </div>
                      <div className="text-xl font-extrabold text-slate-900 tabular-nums">
                        ${asset.estimatedValue.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        ERC-3643 SHARES TO MINT (@ $10)
                      </div>
                      <div className="text-xl font-extrabold text-teal-700 tabular-nums">
                        {Math.round(asset.estimatedValue / 10).toLocaleString()} SHARES
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">IPFS PROOFS</div>
                      <div className="text-sm font-bold text-slate-800">
                        {asset.documents?.length || 0} {lang === 'vi' ? 'chứng từ' : 'files'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      disabled={busyId === asset.id}
                      onClick={() => handleApproveTokenization(asset, 'APPROVE')}
                      className="flex-1 py-3.5 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-extrabold uppercase tracking-wider transition"
                    >
                      {busyId === asset.id
                        ? 'Deploying ERC-3643 + ERC-4626 Contracts on EVM...'
                        : lang === 'vi'
                        ? '⚡ Phê duyệt & Đúc Hợp đồng ERC-3643 + ERC-4626 On-chain (API-06)'
                        : '⚡ Approve & Deploy ERC-3643 + ERC-4626 On-Chain (API-06)'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === asset.id}
                      onClick={() => handleApproveTokenization(asset, 'REJECT')}
                      className="py-3.5 px-4 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition"
                    >
                      {lang === 'vi' ? 'Từ chối' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Active Deployed Vehicle Contracts Summary */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 mb-3">
                {lang === 'vi'
                  ? `Phương tiện đã Token hóa trên EVM (${tokenizedAssets.length})`
                  : `Live On-Chain Tokenized Fleet (${tokenizedAssets.length})`}
              </h3>
              <div className="space-y-2.5">
                {tokenizedAssets.map((a) => {
                  const tk = a.tokens?.[0];
                  return (
                    <div
                      key={a.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-extrabold text-slate-900">{a.vehicleName}</span>{' '}
                        <span className="text-slate-500">({a.assetCode})</span>
                        {tk && (
                          <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                            ERC-3643: {tk.contractAddress} · Vault: {tk.vaultAddress}
                          </div>
                        )}
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold shrink-0">
                        {tk ? `${tk.totalSupply.toLocaleString()} ${tk.tokenSymbol}` : 'TOKENIZED'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 4 cols: PIPELINE STATS & Core EVM Contracts matching Fig 5.19 */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-3.5">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                <span>PIPELINE STATS</span>
              </h3>
              {[
                { label: 'VIN verification', status: 'COMPLETE', color: 'text-emerald-600' },
                { label: 'Title document IPFS', status: 'READY', color: 'text-teal-600' },
                { label: 'ERC-3643 Compliance', status: 'ACTIVE', color: 'text-emerald-600' },
                { label: 'Besu / EVM RPC Node', status: 'SYNCED', color: 'text-teal-600' },
              ].map((row) => (
                <div
                  key={row.label}
                  className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-slate-600">{row.label}</span>
                  <span className={`font-extrabold tracking-wider ${row.color}`}>{row.status}</span>
                </div>
              ))}
            </div>

            {overview?.coreContracts && (
              <div className="bg-navy-900 text-white rounded-3xl p-6 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider">
                  <Cpu className="w-4 h-4" />
                  <span>DEPLOYED CORE SMART CONTRACTS</span>
                </div>
                {Object.entries(overview.coreContracts).map(([name, addr]) => (
                  <div key={name} className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[11px] font-bold text-slate-300">{name}</div>
                    <div className="text-[11px] font-mono text-teal-300 truncate mt-0.5">{addr}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : tab === 'maintenance' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* API-10 Immutable Maintenance Proof */}
          <form
            onSubmit={handleProveMaintenance}
            className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4"
          >
            <h2 className="text-base font-extrabold text-slate-900">
              {lang === 'vi'
                ? 'Phê duyệt Bảo dưỡng Lớn & Ghi Bằng chứng On-chain (API-10)'
                : 'Approve & Prove Maintenance On-Chain (API-10)'}
            </h2>
            <p className="text-xs text-slate-500">
              {lang === 'vi'
                ? 'Ghi bất biến mã CID hóa đơn bảo dưỡng lên hợp đồng VehicleIdentityRegistry nhằm chống sửa đổi lịch sử khấu hao xe.'
                : 'Records an immutable maintenance invoice CID onto VehicleIdentityRegistry.'}
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                {lang === 'vi' ? 'Chọn phương tiện đã Token hóa' : 'Select Tokenized Vehicle'}
              </label>
              <select
                value={maintAssetId}
                onChange={(e) => setMaintAssetId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold"
              >
                {tokenizedAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.assetCode} — {a.vehicleName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                {lang === 'vi' ? 'Xưởng dịch vụ thực hiện' : 'Authorized Garage Name'}
              </label>
              <input
                type="text"
                required
                value={garageName}
                onChange={(e) => setGarageName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                {lang === 'vi' ? 'Mã IPFS CID của hóa đơn bảo dưỡng' : 'Maintenance Invoice IPFS CID'}
              </label>
              <input
                type="text"
                required
                value={invoiceCid}
                onChange={(e) => setInvoiceCid(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={busyId === 'maint' || tokenizedAssets.length === 0}
              className="w-full py-3 rounded-xl bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white text-xs font-extrabold uppercase tracking-wider transition"
            >
              {busyId === 'maint'
                ? 'Recording on Blockchain...'
                : lang === 'vi'
                ? 'Ghi Bằng chứng Bảo dưỡng Bất biến (API-10)'
                : 'Record Maintenance Proof On-Chain (API-10)'}
            </button>
          </form>

          {/* Assign Fleet Operator */}
          <form
            onSubmit={handleAssignOperator}
            className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4"
          >
            <h2 className="text-base font-extrabold text-slate-900">
              {lang === 'vi'
                ? 'Phân công Người vận hành Đội xe (asset_operator_assignments)'
                : 'Assign Verified Fleet Operator'}
            </h2>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                {lang === 'vi' ? 'Phương tiện' : 'Vehicle'}
              </label>
              <select
                value={assignAssetId}
                onChange={(e) => setAssignAssetId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold"
              >
                {(overview?.assets || []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.assetCode} — {a.vehicleName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                {lang === 'vi' ? 'Người vận hành / Tài xế (OPERATOR)' : 'Operator'}
              </label>
              <select
                value={assignOperatorId}
                onChange={(e) => setAssignOperatorId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold"
              >
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.fullName} ({op.email})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={busyId === 'assign' || operators.length === 0}
              className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-extrabold uppercase tracking-wider transition"
            >
              {lang === 'vi' ? 'Lưu Phân công Vận hành' : 'Assign Operator'}
            </button>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="text-[11px] font-bold uppercase text-slate-400">
                {lang === 'vi' ? 'Danh sách phân công hiện hành:' : 'Active Assignments:'}
              </div>
              {(overview?.assignments || []).map((asg) => (
                <div
                  key={asg.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex justify-between"
                >
                  <span className="font-bold text-slate-800">{asg.asset.assetCode}</span>
                  <span className="text-slate-600">{asg.operator.fullName}</span>
                </div>
              ))}
            </div>
          </form>
        </div>
      ) : (
        /* KYC REVIEW TAB */
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm overflow-x-auto">
          <h2 className="text-base font-extrabold text-slate-900 mb-1">
            {lang === 'vi'
              ? 'Quản lý Danh sách Tuân thủ ONCHAINID (Chuẩn ERC-3643)'
              : 'ERC-3643 ONCHAINID Investor Whitelist Management'}
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            {lang === 'vi'
              ? 'Duyệt hoặc thu hồi chứng nhận KYC trực tiếp trên hợp đồng thông minh OnchainIdentityRegistry.'
              : 'Register or revoke KYC claims directly on the OnchainIdentityRegistry smart contract.'}
          </p>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider">
                <th className="py-3 pr-4">Người dùng</th>
                <th className="py-3 pr-4">Vai trò</th>
                <th className="py-3 pr-4">Ví Web3</th>
                <th className="py-3 pr-4">Trạng thái KYC</th>
                <th className="py-3 text-right">Thao tác On-chain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(overview?.users || []).map((u) => (
                <tr key={u.id}>
                  <td className="py-3.5 pr-4">
                    <div className="font-bold text-slate-900">{u.fullName}</div>
                    <div className="text-slate-500">{u.email}</div>
                  </td>
                  <td className="py-3.5 pr-4 font-bold text-slate-700">{u.role}</td>
                  <td className="py-3.5 pr-4 font-mono text-slate-600">
                    {u.walletAddress
                      ? `${u.walletAddress.slice(0, 8)}...${u.walletAddress.slice(-6)}`
                      : 'Chưa liên kết'}
                  </td>
                  <td className="py-3.5 pr-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold ${
                        u.kycStatus === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : u.kycStatus === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {u.kycStatus}
                    </span>
                  </td>
                  <td className="py-3.5 text-right space-x-2">
                    {u.kycStatus !== 'VERIFIED' ? (
                      <button
                        type="button"
                        disabled={!u.walletAddress || busyId === u.id}
                        onClick={() => handleVerifyKyc(u, true)}
                        className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white font-bold transition"
                      >
                        {busyId === u.id ? '...' : 'Duyệt KYC On-chain'}
                      </button>
                    ) : (
                      u.role !== 'ADMIN' && (
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={() => handleVerifyKyc(u, false)}
                          className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold transition"
                        >
                          Thu hồi KYC
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
