import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import QuotationList from './pages/QuotationList';
import QuotationCreate from './pages/QuotationCreate';
import DocumentUpload from './pages/DocumentUpload';
import ExtractionReview from './pages/ExtractionReview';
import CategorySelection from './pages/CategorySelection';
import MarketDataReview from './pages/MarketDataReview';
import QuotationBreakdown from './pages/QuotationBreakdown';
import ApprovalScreen from './pages/ApprovalScreen';
import OutputPreview from './pages/OutputPreview';
import AuditHistory from './pages/AuditHistory';

// Admin Pages
import CategoryMaster from './pages/admin/CategoryMaster';
import FormulaMaster from './pages/admin/FormulaMaster';
import BenchmarkSettings from './pages/admin/BenchmarkSettings';
import UserManagement from './pages/admin/UserManagement';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        {/* Main Routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/quotations" element={<QuotationList />} />
        <Route path="/quotations/new" element={<QuotationCreate />} />
        <Route path="/quotations/:id" element={<QuotationBreakdown />} />
        <Route path="/quotations/:id/documents" element={<DocumentUpload />} />
        <Route path="/quotations/:id/extraction" element={<ExtractionReview />} />
        <Route path="/quotations/:id/category" element={<CategorySelection />} />
        <Route path="/quotations/:id/market-data" element={<MarketDataReview />} />
        <Route path="/quotations/:id/approval" element={<ApprovalScreen />} />
        <Route path="/quotations/:id/output" element={<OutputPreview />} />
        <Route path="/audit" element={<AuditHistory />} />
        <Route path="/market-data" element={<MarketDataReview />} />

        {/* Admin Routes */}
        <Route path="/admin/categories" element={<ProtectedRoute requiredRole="admin"><CategoryMaster /></ProtectedRoute>} />
        <Route path="/admin/formulas" element={<ProtectedRoute requiredRole="admin"><FormulaMaster /></ProtectedRoute>} />
        <Route path="/admin/benchmarks" element={<ProtectedRoute requiredRole="admin"><BenchmarkSettings /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><UserManagement /></ProtectedRoute>} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}
