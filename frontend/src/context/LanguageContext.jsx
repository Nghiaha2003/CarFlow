import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext(null);

const DICTIONARY = {
  vi: {
    brandSub: 'MẠNG RWA LAI WEB2/WEB3',
    navSection: 'ĐIỀU HƯỚNG HỆ THỐNG',
    progressTracker: 'Tiến độ Thực hiện',
    commandCenter: 'Trung tâm Điều hành',
    marketplace: 'Sàn Giao dịch Xe',
    investments: 'Danh mục & Cổ tức',
    myVehicles: 'Hồ sơ Tài sản Xe',
    operations: 'Vận hành & Bảo dưỡng',
    transfers: 'Lịch sử Giao dịch',
    reports: 'Báo cáo & Kiểm toán',
    adminStudio: 'Admin Studio',
    searchPlaceholder: 'Tìm kiếm xe, mã token ERC-3643, biển số, mã giao dịch...',
    connectWallet: 'Kết nối Ví Web3',
    web3Status: 'TRẠNG THÁI VÍ WEB3',
    notConnected: 'Chưa kết nối ví',
    liveDbBadge: 'CSDL 12 Bảng Live',
    roleAdmin: 'QUẢN TRỊ VIÊN',
  },
  en: {
    brandSub: 'HYBRID RWA NETWORK',
    navSection: 'NAVIGATION',
    progressTracker: 'Live Build Progress',
    commandCenter: 'Command Center',
    marketplace: 'Marketplace',
    investments: 'Investments & Vaults',
    myVehicles: 'Vehicle Onboarding',
    operations: 'Maintenance & Ops',
    transfers: 'Transfers',
    reports: 'Report Gallery',
    adminStudio: 'Admin Studio',
    searchPlaceholder: 'Search vehicles, ERC-3643 token IDs, plates, or tx hashes...',
    connectWallet: 'Connect Wallet',
    web3Status: 'WEB3 STATUS',
    notConnected: 'Not Connected',
    liveDbBadge: '12-Table Live DB',
    roleAdmin: 'SYSTEM ADMIN',
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('vi');
  const t = DICTIONARY[lang];
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
