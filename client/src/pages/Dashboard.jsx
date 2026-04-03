import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Clock, CheckCircle, FileText } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { getQuotations, getReportsSummary } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [statsData, setStatsData] = useState({
    totalQuotations: 0,
    pendingApproval: 0,
    releasedThisMonth: 0,
    avgProcessingTime: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryRes, quotationsRes] = await Promise.all([
        getReportsSummary(),
        getQuotations({ limit: 5, sort: '-createdAt' })
      ]);

      const summaryData = summaryRes.data;
      setSummary(summaryData);

      setStatsData({
              totalQuotations: summaryData.quotations?.total || 0,
              pendingApproval: summaryData.quotations?.pendingApproval || 0,
              releasedThisMonth: summaryData.quotations?.released || 0,
        avgProcessingTime: summaryData.avgProcessingTime || 0
      });

      setQuotations(quotationsRes.data?.data || []);
    } catch (err) {
      toast.error('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  const statusChartData = summary?.statusDistribution || [];
  const volumeChartData = summary?.monthlyVolume || [];

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-6">
        {/* Total Quotations */}
        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium mb-1">Total Quotations</p>
              <h3 className="text-3xl font-bold text-slate-900">{statsData.totalQuotations}</h3>
            </div>
            <FileText className="w-8 h-8 text-primary-800 opacity-20" />
          </div>
          <p className="text-xs text-green-600 font-medium mt-4">All time</p>
        </div>

        {/* Pending Approval */}
        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium mb-1">Pending Approval</p>
              <h3 className="text-3xl font-bold text-amber-600">{statsData.pendingApproval}</h3>
            </div>
            <Clock className="w-8 h-8 text-amber-600 opacity-20" />
          </div>
          <p className="text-xs text-slate-600 font-medium mt-4">Requires immediate action</p>
        </div>

        {/* Released This Month */}
        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium mb-1">Released This Month</p>
              <h3 className="text-3xl font-bold text-green-600">{statsData.releasedThisMonth}</h3>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600 opacity-20" />
          </div>
          <p className="text-xs text-slate-600 font-medium mt-4">On track</p>
        </div>

        {/* Avg Processing Time */}
        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium mb-1">Avg Processing Time</p>
              <h3 className="text-3xl font-bold text-slate-900">{statsData.avgProcessingTime} hrs</h3>
            </div>
            <TrendingUp className="w-8 h-8 text-primary-800 opacity-20" />
          </div>
          <p className="text-xs text-slate-600 font-medium mt-4">From creation to release</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Quotations by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#1e40af" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Volume */}
        <div className="card p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Monthly Quotation Volume</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={volumeChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="volume" stroke="#1e40af" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Quotations */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Recent Quotations</h3>
          <button
            onClick={() => navigate('/quotations')}
            className="text-primary-800 hover:text-primary-900 text-sm font-medium"
          >
            View All
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200">
              <tr className="text-left text-slate-600 font-semibold">
                <th className="pb-3">Reference</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Date</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {quotations.map(q => (
                <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/quotations/${q.id}`)}>
                  <td className="py-3 font-medium text-slate-900">{q.reference}</td>
                  <td className="py-3 text-slate-600">{q.customer_name}</td>
                  <td className="py-3 text-slate-600">{q.quotation_type}</td>
                  <td className="py-3"><StatusBadge status={q.status} /></td>
                  <td className="py-3 text-slate-600">{new Date(q.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 text-right">
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/quotations/${q.id}`); }} className="text-primary-800 hover:text-primary-900 font-medium">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => navigate('/quotations/new')}
          className="btn-primary"
        >
          New Quotation
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
