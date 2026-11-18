import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import AccountSecurityPage from './pages/AccountSecurityPage';
import ProgressPage from './pages/ProgressPage';
import MarketplacePreviewPage from './pages/MarketplacePreviewPage';
import MyVehiclesPage from './pages/MyVehiclesPage';
import ModuleBlueprintPage from './pages/ModuleBlueprintPage';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/progress" replace />} />
                    <Route path="/progress" element={<ProgressPage />} />
                    <Route path="/account" element={<AccountSecurityPage />} />
                    <Route path="/marketplace" element={<MarketplacePreviewPage />} />
                    <Route path="/my-vehicles" element={<MyVehiclesPage />} />

            <Route
              path="/admin"
              element={
                <ModuleBlueprintPage
                  moduleCode="Module 4"
                  titleVi="Admin Studio — Kiểm duyệt KYC & Phát hành Token RWA On-chain"
                  titleEn="Admin Studio — KYC Compliance & On-Chain RWA Minting"
                  summaryVi="Không gian làm việc đặc quyền theo Hình 5.19 để Admin duyệt KYC nhà đầu tư và kích hoạt hợp đồng thông minh đúc định danh xe + triển khai VehicleShareToken (ERC-3643) & DividendVault (ERC-4626)."
                  summaryEn="Privileged workspace matching Figure 5.19 for KYC whitelisting and deploying VehicleShareToken (ERC-3643) & DividendVault (ERC-4626)."
                  features={[
                    { vi: 'Duyệt danh tính KYC/ONCHAINID cho địa chỉ ví Nhà đầu tư', en: 'Verify Investor wallet KYC for ERC-3643 compliance whitelist' },
                    { vi: 'Thẩm định chứng từ IPFS và gọi AssetTokenizationManager trên chuỗi EVM (API-06)', en: 'Audit IPFS proofs & trigger AssetTokenizationManager on-chain (API-06)' },
                    { vi: 'Phân công Người vận hành (Operator) cho từng phương tiện', en: 'Assign verified Fleet Operators to tokenized vehicles' },
                  ]}
                />
              }
            />

            <Route
              path="/transfers"
              element={
                <ModuleBlueprintPage
                  moduleCode="Module 5"
                  titleVi="Sổ cái Giao dịch & Chuyển nhượng Tuân thủ ERC-3643"
                  titleEn="On-Chain Transaction Ledger & Compliant ERC-3643 Transfers"
                  summaryVi="Theo dõi toàn bộ lịch sử mua cổ phần sơ cấp và chuyển nhượng thứ cấp giữa các ví đã xác thực KYC, đối chiếu trực tiếp mã giao dịch blockchain_tx_hash."
                  summaryEn="Full ledger of primary share purchases and compliant secondary transfers between KYC-verified wallets."
                  features={[
                    { vi: 'Chuyển nhượng cổ phần ERC-3643 có kiểm tra điều kiện tuân thủ tự động trên Smart Contract', en: 'Peer-to-peer ERC-3643 share transfer with automated compliance check' },
                    { vi: 'Tra cứu và đối chiếu mã giao dịch Blockchain (tx_hash)', en: 'Direct Blockchain transaction hash verification' },
                  ]}
                />
              }
            />

            <Route
              path="/investments"
              element={
                <ModuleBlueprintPage
                  moduleCode="Module 6"
                  titleVi="Danh mục Đầu tư & Kho Cổ tức Tự động (ERC-4626 Yield Vaults)"
                  titleEn="My Portfolio & ERC-4626 Dividend Yield Vaults"
                  summaryVi="Giao diện theo mẫu Investments trong báo cáo: hiển thị tổng vốn đầu tư, tỷ suất lợi nhuận thực tế và nút Withdraw Earnings rút cổ tức trực tiếp từ hợp đồng DividendVault."
                  summaryEn="Portfolio dashboard displaying active ERC-3643 share positions, accrued revenue share, and 1-click Withdraw Earnings from ERC-4626 Vaults."
                  features={[
                    { vi: 'Tổng hợp giá trị cổ phần nắm giữ (token_holdings) theo thời gian thực', en: 'Real-time portfolio valuation across tokenized vehicles' },
                    { vi: 'Tự động tính toán cổ tức được chia theo tỷ lệ nắm giữ VehicleShareToken', en: 'Pro-rata yield calculation via ERC-4626 DividendVault' },
                    { vi: 'Rút lợi tức trực tiếp về ví MetaMask', en: 'Claim & withdraw earnings directly to MetaMask wallet' },
                  ]}
                />
              }
            />

            <Route
              path="/operations"
              element={
                <ModuleBlueprintPage
                  moduleCode="Module 6"
                  titleVi="Nhật ký Vận hành Đội xe, Sạc điện & Bảo dưỡng"
                  titleEn="Daily Fleet Operations, Charging & Maintenance Logs"
                  summaryVi="Phân hệ dành cho Người vận hành (Operator) cập nhật quãng đường di chuyển, doanh thu khai thác, chi phí nhiên liệu/bảo dưỡng hàng ngày và nạp lợi nhuận ròng vào Vault."
                  summaryEn="Operator portal for logging daily mileage, gross trip revenue, charging/maintenance costs, and syncing net yield."
                  features={[
                    { vi: 'Cập nhật nhật ký ca chạy xe hàng ngày của phương tiện được phân công (API-09)', en: 'Log daily mileage, revenue, and expenses for assigned vehicles (API-09)' },
                    { vi: 'Lưu vết kiểm toán (audit_logs) mọi thao tác cập nhật số liệu', en: 'Immutable audit trail logging for operational updates' },
                  ]}
                />
              }
            />

            <Route
              path="/command-center"
              element={
                <ModuleBlueprintPage
                  moduleCode="Module 7"
                  titleVi="Command Center — Phân tích Xu hướng Doanh thu & Hiệu suất Dòng tiền"
                  titleEn="Command Center — Revenue, Yield & Utilization Analytics"
                  summaryVi="Dashboard phân tích tổng hợp theo Hình 5.20: biểu đồ doanh thu/lợi tức theo tháng, tỷ trọng phân khúc đội xe (EV, Luxury, Logistics) và luồng sự kiện tuân thủ."
                  summaryEn="Executive analytics matching Figure 5.20: monthly revenue & yield trends, segment allocation, and live compliance queue."
                  features={[
                    { vi: 'Biểu đồ trực quan hóa doanh thu ròng, APR thực tế và tỷ lệ khai thác đội xe', en: 'Interactive Revenue, Yield, and Utilization trend charts' },
                    { vi: 'Thống kê phân bổ vốn theo phân khúc phương tiện', en: 'Portfolio segment exposure breakdown' },
                  ]}
                />
              }
            />

            <Route
              path="/reports"
              element={
                <ModuleBlueprintPage
                  moduleCode="Module 7"
                  titleVi="Trung tâm Báo cáo & Kiểm toán Đối chiếu On-chain / Off-chain"
                  titleEn="Report Gallery & On-Chain / Off-Chain Audit Verifier"
                  summaryVi="Xuất báo cáo tổng hợp tài sản, giao dịch, vận hành (lưu vết report_logs) và kiểm chứng tính toàn vẹn giữa cơ sở dữ liệu với mạng Blockchain & IPFS."
                  summaryEn="Generate filtered operational/financial reports and verify cryptographic consistency between DB records, IPFS CIDs, and Smart Contracts."
                  features={[
                    { vi: 'Truy xuất báo cáo đa chiều và ghi nhận lịch sử report_logs', en: 'Multi-dimensional report builder & report_logs persistence' },
                    { vi: 'Công cụ kiểm chứng mã băm hồ sơ IPFS và giao dịch trên chuỗi khối', en: 'Cryptographic hash & on-chain state verifier' },
                  ]}
                />
              }
            />
                  </Routes>
                </Layout>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
