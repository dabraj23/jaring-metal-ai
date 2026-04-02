import React, { useState, useEffect } from 'react';
import { Download, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { getGlobalAudit } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';

export const AuditHistory = () => {
  const [auditTrail, setAuditTrail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    entityType: '',
    user: '',
    action: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });

  useEffect(() => {
    fetchAuditTrail();
  }, [filters, pagination.page]);

  const fetchAuditTrail = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };
      const res = await getGlobalAudit(params);
      setAuditTrail(res.data?.data || []);
      setPagination(prev => ({ ...prev, total: res.data?.total || 0 }));
    } catch (err) {
      toast.error('Failed to load audit trail');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      entityType: '',
      user: '',
      action: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleExportCSV = () => {
    // CSV export functionality would be implemented
    toast.info('CSV export not yet implemented');
  };

  if (loading && auditTrail.length === 0) {
    return <LoadingSpinner message="Loading audit history..." />;
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Audit Log</h2>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-900 rounded hover:bg-slate-300 font-medium"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </h3>
          <button
            onClick={handleResetFilters}
            className="text-primary-800 hover:text-primary-900 text-sm font-medium"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="form-label">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Entity Type</label>
            <select
              value={filters.entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
              className="form-input"
            >
              <option value="">All Types</option>
              <option value="quotation">Quotation</option>
              <option value="document">Document</option>
              <option value="category">Category</option>
              <option value="benchmark">Benchmark</option>
              <option value="user">User</option>
            </select>
          </div>

          <div>
            <label className="form-label">User</label>
            <input
              type="text"
              value={filters.user}
              onChange={(e) => handleFilterChange('user', e.target.value)}
              className="form-input"
              placeholder="User name..."
            />
          </div>

          <div>
            <label className="form-label">Action</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="form-input"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
              <option value="release">Release</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-slate-600 font-semibold">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Entity Type</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Entity ID</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {auditTrail.map((entry, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{entry.user_name}</td>
                  <td className="px-6 py-4 text-slate-600 capitalize">{entry.entity_type}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      entry.action === 'create' ? 'bg-blue-100 text-blue-800' :
                      entry.action === 'update' ? 'bg-indigo-100 text-indigo-800' :
                      entry.action === 'delete' ? 'bg-red-100 text-red-800' :
                      entry.action === 'approve' ? 'bg-green-100 text-green-800' :
                      entry.action === 'reject' ? 'bg-red-100 text-red-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">{entry.entity_id}</td>
                  <td className="px-6 py-4 text-slate-700">{entry.description}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {entry.old_value && entry.new_value && (
                      <button className="text-primary-800 hover:text-primary-900 font-medium text-xs">
                        View Changes
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {auditTrail.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600 font-medium">No audit records found</p>
          </div>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing {auditTrail.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = pagination.page - 2 + i;
              if (page < 1 || page > totalPages) return null;
              return (
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
              );
            })}
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

export default AuditHistory;
