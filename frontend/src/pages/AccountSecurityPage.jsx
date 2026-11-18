import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet as EthersWallet } from 'ethers';
import {
  ShieldCheck,
  Wallet,
  UserCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const ROLE_PERMISSIONS = {
  ADMIN: [
    'Phê duyệt hồ sơ xe & kích hoạt đúc Token hóa RWA on-chain (API-06)',
    'Xác thực danh tính KYC / ONCHAINID cho ví Nhà đầu tư chuẩn ERC-3643',
    'Phê duyệt chứng từ bảo dưỡng lớn & ghi bằng chứng bất biến (API-10)',
    'Đóng băng / thu hồi cổ phần tuân thủ pháp lý & xem toàn bộ Audit Logs',
  ],
  OWNER: [
    'Khai báo tài sản phương tiện vận tải mới vào hệ thống (API-04)',
    'Tải giấy đăng ký, đăng kiểm, bảo hiểm lên mạng lưu trữ IPFS (API-05)',
    'Gửi yêu cầu phát hành cổ phần RWA chuẩn ERC-3643 và theo dõi tiến độ gọi vốn',
  ],
  INVESTOR: [
    'Duyệt Sàn giao dịch xe RWA (Marketplace) và kiểm chứng mã CID IPFS (API-07)',
    'Mua cổ phần VehicleShareToken (ERC-3643) và chuyển nhượng thứ cấp hợp lệ (API-08)',
    'Theo dõi danh mục đầu tư và rút lợi tức tự động từ DividendVault (ERC-4626)',
  ],
  OPERATOR: [
    'Cập nhật nhật ký hành trình hàng ngày: số km, doanh thu cuốc xe, chi phí sạc/xăng (API-09)',
    'Báo cáo định kỳ tình trạng kỹ thuật và yêu cầu bảo dưỡng phương tiện được phân công',
  ],
};

export default function AccountSecurityPage() {
  const { user, linkWallet, submitKycRequest } = useAuth();
  const { lang } = useLanguage();

  const [walletInput, setWalletInput] = useState(user?.walletAddress || '');
  const [identityNumber, setIdentityNumber] = useState('079203004567');
  const [busyWallet, setBusyWallet] = useState(false);
  const [busyKyc, setBusyKyc] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm">
        <KeyRound className="w-10 h-10 text-brand-blue mx-auto mb-3" />
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">
          {lang === 'vi' ? 'Bạn chưa đăng nhập phiên làm việc' : 'No Active Session'}
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          {lang === 'vi'
            ? 'Hãy đăng nhập bằng một trong 4 vai trò (Admin, Owner, Investor, Operator) hoặc tạo tài khoản mới để quản lý ví Web3 & hồ sơ KYC ERC-3643.'
            : 'Sign in with any of the 4 RBAC roles or register a new account to link your Web3 wallet and manage ERC-3643 KYC.'}
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-sm font-bold transition"
        >
          <LogIn className="w-4 h-4" />
          <span>{lang === 'vi' ? 'Đi tới Trang Đăng nhập / Đăng ký' : 'Go to Sign In / Register'}</span>
        </Link>
      </div>
    );
  }

  const handleConnectMetaMask = async () => {
    setFeedback(null);
    if (window.ethereum) {
      try {
        setBusyWallet(true);
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts?.[0]) {
          setWalletInput(accounts[0]);
          await linkWallet(accounts[0]);
          setFeedback({ type: 'success', text: 'Đã kết nối và lưu địa chỉ ví MetaMask thành công (API-03)!' });
        }
      } catch (err) {
        setFeedback({ type: 'error', text: err.message || 'Không thể kết nối ví MetaMask.' });
      } finally {
        setBusyWallet(false);
      }
    } else {
      const randomWallet = EthersWallet.createRandom();
      setWalletInput(randomWallet.address);
      setFeedback({
        type: 'info',
        text:
          lang === 'vi'
            ? `Trình duyệt hiện không cài MetaMask. Hệ thống đã tạo sẵn một địa chỉ ví EVM hợp lệ (${randomWallet.address.slice(0, 10)}...) — bấm "Lưu Địa chỉ Ví" để liên kết ngay!`
            : `MetaMask not detected. Generated valid EVM test address (${randomWallet.address.slice(0, 10)}...) — click Save Wallet to link!`,
      });
    }
  };

  const handleSaveWallet = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setBusyWallet(true);
    try {
      await linkWallet(walletInput);
      setFeedback({
        type: 'success',
        text:
          lang === 'vi'
            ? 'Đã cập nhật địa chỉ ví Web3 vào cơ sở dữ liệu & ghi nhận Audit Log (API-03)!'
            : 'Web3 wallet address linked and recorded in Audit Log (API-03)!',
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setBusyWallet(false);
    }
  };

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setBusyKyc(true);
    try {
      await submitKycRequest(identityNumber, 'VN');
      setFeedback({
        type: 'success',
        text:
          lang === 'vi'
            ? 'Đã gửi yêu cầu xác thực danh tính ONCHAINID (ERC-3643)!'
            : 'Submitted ONCHAINID KYC verification request!',
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setBusyKyc(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
          MODULE 1 · JWT RBAC + WEB3 WALLET + ONCHAINID KYC
        </span>
        <h1 className="text-2xl font-extrabold text-slate-900 mt-2">
          {lang === 'vi' ? 'Hồ sơ Định danh, Phân quyền & Ví Web3' : 'Identity, RBAC Permissions & Web3 Wallet'}
        </h1>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-sm font-medium flex items-start gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile & RBAC Card */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-navy-900 text-teal-400 font-extrabold text-lg flex items-center justify-center">
              {user.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">{user.fullName}</h2>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <div className="text-[10px] font-bold uppercase text-slate-400">RBAC ROLE</div>
              <div className="text-sm font-extrabold text-slate-900 mt-0.5">{user.role}</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <div className="text-[10px] font-bold uppercase text-slate-400">ERC-3643 KYC</div>
              <div
                className={`text-sm font-extrabold mt-0.5 ${
                  user.kycStatus === 'VERIFIED'
                    ? 'text-emerald-600'
                    : user.kycStatus === 'PENDING'
                    ? 'text-amber-600'
                    : 'text-slate-600'
                }`}
              >
                {user.kycStatus}
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>{lang === 'vi' ? 'Quyền hạn vai trò hiện tại' : 'Active Role Permissions'}</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-600">
              {(ROLE_PERMISSIONS[user.role] || []).map((perm, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                  <span>{perm}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Wallet Link (API-03) + KYC Submission */}
        <div className="lg:col-span-7 space-y-6">
          <form
            onSubmit={handleSaveWallet}
            className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-brand-blue" />
                <span>
                  {lang === 'vi'
                    ? 'Liên kết Địa chỉ Ví Web3 (API-03: PUT /api/v1/users/wallet)'
                    : 'Link Web3 Wallet Address (API-03)'}
                </span>
              </h3>
              <button
                type="button"
                disabled={busyWallet}
                onClick={handleConnectMetaMask}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'vi' ? 'Lấy từ MetaMask / Tạo Ví EVM' : 'MetaMask / Generate EVM'}</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                {lang === 'vi' ? 'Địa chỉ Ví EVM (Hyperledger Besu / Ethereum)' : 'EVM Wallet Address'}
              </label>
              <input
                type="text"
                required
                value={walletInput}
                onChange={(e) => setWalletInput(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono text-slate-800 focus:outline-none focus:border-brand-blue"
              />
            </div>

            <button
              type="submit"
              disabled={busyWallet}
              className="px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white text-xs font-bold transition"
            >
              {busyWallet
                ? lang === 'vi'
                  ? 'Đang lưu...'
                  : 'Saving...'
                : lang === 'vi'
                ? 'Lưu Địa chỉ Ví vào Hệ thống'
                : 'Save Linked Wallet'}
            </button>
          </form>

          <form
            onSubmit={handleKycSubmit}
            className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4"
          >
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>
                {lang === 'vi'
                  ? 'Đăng ký Danh tính Tuân thủ ONCHAINID (Chuẩn ERC-3643)'
                  : 'ERC-3643 ONCHAINID Compliance Registration'}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'vi'
                ? 'Theo tiêu chuẩn RWA ERC-3643, chỉ các ví đã được xác thực danh tính (KYC/AML) mới được phép nắm giữ và nhận chuyển nhượng cổ phần phương tiện.'
                : 'Under ERC-3643, only KYC-verified wallets in the IdentityRegistry can hold or receive vehicle share tokens.'}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                {lang === 'vi' ? 'Số CCCD / Mã số Doanh nghiệp' : 'National ID / Business Registration No.'}
              </label>
              <input
                type="text"
                required
                value={identityNumber}
                onChange={(e) => setIdentityNumber(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <button
              type="submit"
              disabled={busyKyc || user.kycStatus === 'VERIFIED'}
              className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold transition"
            >
              {user.kycStatus === 'VERIFIED'
                ? lang === 'vi'
                  ? '✓ Đã xác thực ONCHAINID (VERIFIED)'
                  : '✓ ONCHAINID Verified'
                : busyKyc
                ? lang === 'vi'
                  ? 'Đang gửi...'
                  : 'Submitting...'
                : lang === 'vi'
                ? 'Gửi Hồ sơ Xác thực KYC'
                : 'Submit KYC Verification'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
