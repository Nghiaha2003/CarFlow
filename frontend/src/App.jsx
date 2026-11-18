import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import AccountSecurityPage from './pages/AccountSecurityPage';
import ProgressPage from './pages/ProgressPage';
import MarketplacePreviewPage from './pages/MarketplacePreviewPage';
import AssetDetailPage from './pages/AssetDetailPage';
import TransfersPage from './pages/TransfersPage';
import InvestmentsPage from './pages/InvestmentsPage';
import OperationsPage from './pages/OperationsPage';
import MyVehiclesPage from './pages/MyVehiclesPage';
import AdminStudioPage from './pages/AdminStudioPage';
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
                    <Route path="/marketplace/:id" element={<AssetDetailPage />} />
                    <Route path="/my-vehicles" element={<MyVehiclesPage />} />
                    <Route path="/admin" element={<AdminStudioPage />} />
                    <Route path="/transfers" element={<TransfersPage />} />
                    <Route path="/investments" element={<InvestmentsPage />} />
                    <Route path="/operations" element={<OperationsPage />} />

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
