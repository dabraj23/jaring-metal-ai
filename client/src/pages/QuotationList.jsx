import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { getQuotations } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';

export const QuotationList = () => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });

  useEffect(() => {
    fetchQuotations();
  }, [filters, pagination.page]);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };
      const res = await getQuotations(params);
      setQuotations(res.data?.data || []);
      setPagination(prev => ({ ...prev, total: res.data?.total || 0 }));
    } catch (err) {
      toast.error('Failed to load quotations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  if (loading) {
    return <LoadingSpinner message="Loading quotations..." />;
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Quotations</h2>
        <button
          onClick={() => navigate('/quotations/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Quotation
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="form-label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="form-input pl-10"
                placeholder="Reference or customer..."
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="form-label">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="form-input"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="extracted">Extracted</option>
              <option value="reviewed">Reviewed</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="released">Released</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="form-label">Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="form-input"
            >
              <option value="">All Types</option>
              <option value="Monthly Quotation">Monthly Quotation</option>
              <option value="Formula Quotation">Formula Quotation</option>
              <option value="Recovery Settlement">Recovery Settlement</option>
            </select>
          </div>

          {/* Reset */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({ status: '', type: '', search: '' });
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="btn-secondary w-full"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-sm font-semibold text-slate-600">
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Quote Date</th>
                <th className="px-6 py-4">Pricing Mode</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {quotations.map(q => (
                <tr key={q.id} className="hover:bg-slate-50 cursor-pointer">
                  <td className="px-6 py-4 font-medium text-slate-900">{q.reference}</td>
                  <td className="px-6 py-4 text-slate-600">{q.customer_name}</td>
                  <td className="px-6 py-4 text-slate-600">{q.quotation_type}</td>
                  <td className="px-6 py-4"><StatusBadge status={q.status} /></td>
                  <td className="px-6 py-4 text-slate-600">{new Date(q.quote_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-slate-600 capitalize">{q.pricing_mode}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/quotations/${q.id}`)}
                      className="text-primary-800 hover:text-primary-900 font-medium text-sm"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {quotations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600 font-medium">No quotations found</p>
          </div>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing {quotations.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setPagination(prev => ({ ...prev, page }))}
                className={`px-3 py-2 rounded-lg font-medium ${
                  pagination.page === page
                    ? 'bg-primary-800 text-white'
                    : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
              disabled={pagination.page === totalPages}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationList;
