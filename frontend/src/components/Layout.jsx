import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  LayoutGrid,
  Car,
  Wallet,
  FileCheck2,
  Wrench,
  ArrowLeftRight,
  BarChart3,
  ShieldCheck,
  Search,
  Globe,
  Zap,
  Menu,
  X,
  Database,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Layout({ children }) {
  const { lang, setLang, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletAddr, setWalletAddr] = useState(null);

  const handleQuickWalletCheck = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts?.[0]) setWalletAddr(accounts[0]);
      } catch {
        // User rejected or cancelled
      }
    } else {
      alert(
        lang === 'vi'
          ? 'Trình duyệt hiện chưa cài tiện ích MetaMask. Trong Module 1, hệ thống sẽ tích hợp thêm chế độ Ví Demo ký thử nghiệm ngay trên trình duyệt song song với MetaMask thật!'
          : 'MetaMask extension not detected. Module 1 adds full MetaMask + Local Signer support!'
      );
    }
  };

  const navItems = [
    { to: '/progress', icon: Activity, label: t.progressTracker, badge: 'LIVE' },
    { to: '/command-center', icon: LayoutGrid, label: t.commandCenter, moduleTag: 'M7' },
    { to: '/marketplace', icon: Car, label: t.marketplace, badge: 'DB' },
    { to: '/investments', icon: Wallet, label: t.investments, moduleTag: 'M6' },
    { to: '/my-vehicles', icon: FileCheck2, label: t.myVehicles, moduleTag: 'M2' },
    { to: '/operations', icon: Wrench, label: t.operations, moduleTag: 'M6' },
    { to: '/transfers', icon: ArrowLeftRight, label: t.transfers, moduleTag: 'M5' },
    { to: '/reports', icon: BarChart3, label: t.reports, moduleTag: 'M7' },
    { to: '/admin', icon: ShieldCheck, label: t.adminStudio, moduleTag: 'M4' },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/90 w-[264px] select-none">
      {/* Brand Header matching Fig 5.17-5.20 */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center shadow-sm">
          <Zap className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-lg tracking-tight text-slate-900">CarFlow</span>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
              RWA
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              {t.brandSub}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3.5 py-5">
        <p className="px-3 mb-2.5 text-[11px] font-bold tracking-widest text-slate-400 uppercase">
          {t.navSection}
        </p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-navy-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </span>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          isActive
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-400/30'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {item.moduleTag && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          isActive ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.moduleTag}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Web3 Status Card matching Fig 5.17-5.20 */}
      <div className="p-4 border-t border-slate-100">
        <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {t.web3Status}
              </div>
              <div className="text-xs font-bold text-slate-800 truncate tabular-nums">
                {walletAddr
                  ? `${walletAddr.slice(0, 6)}...${walletAddr.slice(-4)}`
                  : t.notConnected}
              </div>
            </div>
          </div>
          <button
            onClick={handleQuickWalletCheck}
            className="w-full py-2 px-3 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold tracking-wide transition flex items-center justify-center gap-1.5"
          >
            <span>+ {t.connectWallet}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F6F8FB]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0">{SidebarContent()}</aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 flex">
            {SidebarContent()}
            <button
              onClick={() => setMobileOpen(false)}
              className="m-3 w-9 h-9 rounded-lg bg-white text-slate-700 flex items-center justify-center shadow"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar matching Fig 5.17-5.20 */}
        <header className="h-[72px] bg-white border-b border-slate-200/80 px-4 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                readOnly
                placeholder={t.searchPlaceholder}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200/90 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Live DB Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t.liveDbBadge}</span>
            </div>

            {/* Bilingual Toggle VI / EN */}
            <button
              type="button"
              data-testid="lang-toggle"
              onClick={() => setLang((prev) => (prev === 'vi' ? 'en' : 'vi'))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
              title="Switch Language VI / EN"
            >
              <Globe className="w-3.5 h-3.5 text-brand-blue" />
              <span>{lang === 'vi' ? 'Ngôn ngữ: VI' : 'Lang: EN'}</span>
            </button>

            {/* Connect Wallet Primary Button */}
            <button
              onClick={handleQuickWalletCheck}
              className="px-4 py-2 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm transition"
            >
              {walletAddr
                ? `${walletAddr.slice(0, 6)}...${walletAddr.slice(-4)}`
                : t.connectWallet}
            </button>

            {/* Active Profile Pill */}
            <div className="hidden sm:flex items-center gap-2.5 pl-3 pr-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/70">
              <div className="w-7 h-7 rounded-lg bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                HN
              </div>
              <div className="leading-tight">
                <div className="text-xs font-bold text-slate-900">HÀ ĐÌNH NGHĨA</div>
                <div className="text-[10px] font-semibold text-slate-500">{t.roleAdmin}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
