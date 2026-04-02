import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Grid, FileText, TrendingUp, Shield, Settings, Users, Tag, Calculator, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getQuotations } from '../api';

export const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [quotationCount, setQuotationCount] = useState(0);

  useEffect(() => {
    const fetchQuotationCount = async () => {
      try {
        const res = await getQuotations({ status: 'pending_approval' });
        setQuotationCount(res.data?.data?.length || 0);
      } catch (err) {
        console.error('Failed to fetch quotation count:', err);
      }
    };
    fetchQuotationCount();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Grid },
    { path: '/quotations', label: 'Quotations', icon: FileText, badge: quotationCount },
    { path: '/market-data', label: 'Market Data', icon: TrendingUp },
    { path: '/audit', label: 'Audit Log', icon: Shield }
  ];

  const adminItems = user?.role === 'admin' ? [
    { path: '/admin/categories', label: 'Categories', icon: Tag },
    { path: '/admin/formulas', label: 'Formulas', icon: Calculator },
    { path: '/admin/benchmarks', label: 'Benchmarks', icon: Layers },
    { path: '/admin/users', label: 'Users', icon: Users }
  ] : [];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-lg">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-800 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              JM
            </div>
            <div>
              <div className="font-bold text-white">Jaring Metal</div>
              <div className="text-xs text-slate-400">AI Platform</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1 mb-6">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`sidebar-nav-item w-full ${isActive(item.path) ? 'active' : ''}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="bg-red-600 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {adminItems.length > 0 && (
            <>
              <div className="border-t border-slate-700 my-4 pt-4">
                <div className="px-4 py-2 text-xs font-bold uppercase text-slate-400 mb-2">Admin</div>
                <div className="space-y-1">
                  {adminItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={`sidebar-nav-item w-full ${isActive(item.path) ? 'active' : ''}`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </nav>

        {/* User Info */}
        <div className="border-t border-slate-700 p-4">
          <div className="bg-slate-800 rounded-lg p-3 mb-3">
            <div className="text-sm font-medium text-white truncate">{user?.name || 'User'}</div>
            <div className="text-xs text-slate-400 capitalize">{user?.role || 'user'}</div>
          </div>
          <button
            onClick={handleLogout}
            className="sidebar-nav-item w-full justify-center"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">
            {location.pathname === '/dashboard' && 'Dashboard'}
            {location.pathname === '/quotations' && 'Quotations'}
            {location.pathname.startsWith('/quotations/') && 'Quotation Details'}
            {location.pathname === '/market-data' && 'Market Data'}
            {location.pathname === '/audit' && 'Audit Log'}
            {location.pathname === '/admin/categories' && 'Category Master'}
            {location.pathname === '/admin/formulas' && 'Formula Master'}
            {location.pathname === '/admin/benchmarks' && 'Benchmark Settings'}
            {location.pathname === '/admin/users' && 'User Management'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary-800 rounded-full flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
