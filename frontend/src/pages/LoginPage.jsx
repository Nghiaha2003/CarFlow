import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Car, Lock, User, Mail, Phone, ArrowRight, ShieldCheck, AlertCircle, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@carflow.vn', roleDesc: 'Duyệt xe & KYC' },
  { label: 'Owner', email: 'owner@carflow.vn', roleDesc: 'Chủ đội xe' },
  { label: 'Investor', email: 'investor@carflow.vn', roleDesc: 'Nhà đầu tư RWA' },
  { label: 'Operator', email: 'operator@carflow.vn', roleDesc: 'Vận hành xe' },
];

export default function LoginPage() {
  const { login, register } = useAuth();
  const { lang, setLang } = useLanguage();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('admin@carflow.vn');
  const [password, setPassword] = useState('CarFlow@2026');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [roleName, setRoleName] = useState('INVESTOR');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({
          full_name: fullName,
          email,
          password,
          phone_number: phoneNumber,
          role_name: roleName,
        });
      }
      navigate('/account');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const handleQuickDemo = async (demoEmail) => {
    setMode('login');
    setEmail(demoEmail);
    setPassword('CarFlow@2026');
    setError(null);
    setBusy(true);
    try {
      await login(demoEmail, 'CarFlow@2026');
      navigate('/account');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050914] text-white flex flex-col justify-between relative overflow-hidden px-4 py-8">
      {/* Subtle radial glow matching Fig 5.16 */}
      <div className="pointer-events-none absolute top-[-180px] left-1/2 -translate-x-1/2 w-[680px] h-[420px] rounded-full bg-blue-600/15 blur-[130px]" />

      {/* Top utility bar */}
      <div className="relative z-10 max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link
          to="/progress"
          className="text-xs font-bold text-slate-400 hover:text-white transition flex items-center gap-1.5"
        >
          <span>← {lang === 'vi' ? 'Quay lại Bảng Tiến độ' : 'Back to Dashboard'}</span>
        </Link>
        <button
          type="button"
          onClick={() => setLang((prev) => (prev === 'vi' ? 'en' : 'vi'))}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 transition"
        >
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <span>{lang === 'vi' ? 'Ngôn ngữ: VI' : 'Lang: EN'}</span>
        </button>
      </div>

      {/* Center Auth Vault Card matching Fig 5.16 */}
      <div className="relative z-10 w-full max-w-[440px] mx-auto my-8">
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2.5 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30 flex items-center justify-center">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div className="text-xl font-black tracking-tight italic">
              CARFLOW<span className="text-blue-500">RWA</span>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            {mode === 'login'
              ? lang === 'vi'
                ? 'Chào mừng trở lại.'
                : 'Welcome back.'
              : lang === 'vi'
              ? 'Tạo tài khoản RWA.'
              : 'Create RWA Account.'}
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            {mode === 'login'
              ? lang === 'vi'
                ? 'Nhập thông tin xác thực để truy cập kho tài sản số của bạn.'
                : 'Enter your credentials to access your vault.'
              : lang === 'vi'
              ? 'Đăng ký tham gia hệ sinh thái phương tiện mã hóa chuẩn ERC-3643.'
              : 'Register to access the compliant ERC-3643 vehicle ecosystem.'}
          </p>
        </div>

        <div className="rounded-3xl bg-[#0E1525]/95 border border-slate-800/90 shadow-2xl overflow-hidden">
          <form onSubmit={handleSubmit} className="p-7 space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-1.5">
                    {lang === 'vi' ? 'HỌ VÀ TÊN / TỔ CHỨC' : 'FULL NAME / ENTITY'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#090E1A] border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-1.5">
                      {lang === 'vi' ? 'VAI TRÒ THAM GIA' : 'ACCOUNT ROLE'}
                    </label>
                    <select
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      className="w-full px-3 py-3 rounded-xl bg-[#090E1A] border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="INVESTOR">{lang === 'vi' ? 'Nhà đầu tư (INVESTOR)' : 'Investor'}</option>
                      <option value="OWNER">{lang === 'vi' ? 'Chủ tài sản (OWNER)' : 'Asset Owner'}</option>
                      <option value="OPERATOR">{lang === 'vi' ? 'Người vận hành (OPERATOR)' : 'Fleet Operator'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-1.5">
                      {lang === 'vi' ? 'SỐ ĐIỆN THOẠI' : 'PHONE NUMBER'}
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="0909..."
                        className="w-full pl-9 pr-3 py-3 rounded-xl bg-[#090E1A] border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-1.5">
                EMAIL
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="investor@carflow.vn"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#090E1A] border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold tracking-wider uppercase text-slate-400">
                  {lang === 'vi' ? 'MẬT KHẨU' : 'PASSWORD'}
                </label>
                {mode === 'login' && (
                  <span className="text-[11px] font-semibold text-blue-400">
                    Demo: CarFlow@2026
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#090E1A] border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-extrabold tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 mt-2"
            >
              <span>
                {busy
                  ? lang === 'vi'
                    ? 'Đang xử lý...'
                    : 'Authenticating...'
                  : mode === 'login'
                  ? lang === 'vi'
                    ? 'ĐĂNG NHẬP HỆ THỐNG'
                    : 'SIGN IN'
                  : lang === 'vi'
                  ? 'ĐĂNG KÝ TÀI KHOẢN'
                  : 'CREATE ACCOUNT'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick 4-Role Switcher for Thesis Demo */}
            <div className="pt-3 border-t border-slate-800/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>
                  {lang === 'vi'
                    ? 'ĐĂNG NHẬP NHANH 4 TÁC NHÂN MẪU (1-CLICK RBAC):'
                    : '1-CLICK DEMO ROLE ACCESS (RBAC):'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={busy}
                    onClick={() => handleQuickDemo(acc.email)}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-slate-800 text-left transition"
                  >
                    <div className="text-xs font-bold text-white">{acc.label}</div>
                    <div className="text-[10px] text-slate-400 truncate">{acc.roleDesc}</div>
                  </button>
                ))}
              </div>
            </div>
          </form>

          <div className="px-7 py-4 bg-[#131C31]/70 border-t border-slate-800/80 text-center text-xs text-slate-400">
            {mode === 'login' ? (
              <>
                {lang === 'vi' ? 'Chưa có tài khoản CarFlow?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="font-bold text-blue-400 hover:text-blue-300 ml-1"
                >
                  {lang === 'vi' ? 'Đăng ký ngay' : 'Register now'}
                </button>
              </>
            ) : (
              <>
                {lang === 'vi' ? 'Đã có tài khoản?' : 'Already registered?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="font-bold text-blue-400 hover:text-blue-300 ml-1"
                >
                  {lang === 'vi' ? 'Đăng nhập' : 'Sign in'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer Security Banner matching Fig 5.16 */}
      <div className="relative z-10 text-center text-[10px] font-bold tracking-[0.2em] text-slate-600 uppercase">
        JWT RBAC AUTHENTICATION &nbsp;|&nbsp; ERC-3643 ONCHAINID READY
      </div>
    </div>
  );
}
