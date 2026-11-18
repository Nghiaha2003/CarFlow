import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import AccountSecurityPage from './pages/AccountSecurityPage';
import ProgressPage from './pages/ProgressPage';
import CommandCenterPage from './pages/CommandCenterPage';
import MarketplacePreviewPage from './pages/MarketplacePreviewPage';
import AssetDetailPage from './pages/AssetDetailPage';
import InvestmentsPage from './pages/InvestmentsPage';
import MyVehiclesPage from './pages/MyVehiclesPage';
import OperationsPage from './pages/OperationsPage';
import TransfersPage from './pages/TransfersPage';
import ReportsAuditPage from './pages/ReportsAuditPage';
import AdminStudioPage from './pages/AdminStudioPage';

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
                    <Route path="/command-center" element={<CommandCenterPage />} />
                    <Route path="/marketplace" element={<MarketplacePreviewPage />} />
                    <Route path="/marketplace/:id" element={<AssetDetailPage />} />
                    <Route path="/investments" element={<InvestmentsPage />} />
                    <Route path="/my-vehicles" element={<MyVehiclesPage />} />
                    <Route path="/operations" element={<OperationsPage />} />
                    <Route path="/transfers" element={<TransfersPage />} />
                    <Route path="/reports" element={<ReportsAuditPage />} />
                    <Route path="/admin" element={<AdminStudioPage />} />
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
