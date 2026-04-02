import React, { useState, useEffect } from 'react';
import { Edit2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAdminBenchmarks, updateBenchmark } from '../../api';
import LoadingSpinner from '../../components/LoadingSpinner';

export const BenchmarkSettings = () => {
  const [benchmarks, setBenchmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [manualInput, setManualInput] = useState({
    metal: '',
    price: '',
    note: ''
  });

  useEffect(() => {
    fetchBenchmarks();
  }, []);

  const fetchBenchmarks = async () => {
    try {
      setLoading(true);
      const res = await getAdminBenchmarks();
      setBenchmarks(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load benchmarks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (id) => {
    try {
      await updateBenchmark(id, { spot_price: parseFloat(editValue) });
      toast.success('Benchmark updated');
      setEditingId(null);
      fetchBenchmarks();
    } catch (err) {
      toast.error('Failed to update benchmark');
      console.error(err);
    }
  };

  const handleTestConnection = (source) => {
    toast.info(`Testing connection to ${source}...`);
    // Connection test would be implemented
  };

  if (loading) {
    return <LoadingSpinner message="Loading benchmarks..." />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">Benchmark Settings</h2>

      <div className="grid grid-cols-3 gap-6">
        {/* Benchmarks Table */}
        <div className="col-span-2">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-slate-600 font-semibold">
                    <th className="px-6 py-4">Metal</th>
                    <th className="px-6 py-4">Code</th>
                    <th className="px-6 py-4">Unit</th>
                    <th className="px-6 py-4">Spot Price</th>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4">Fallback</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {benchmarks.map(bench => (
                    <tr key={bench.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{bench.metal_name}</td>
                      <td className="px-6 py-4 text-slate-600 font-mono">{bench.metal_code}</td>
                      <td className="px-6 py-4 text-slate-600">{bench.unit}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {editingId === bench.id ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="form-input w-24"
                          />
                        ) : (
                          bench.spot_price
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{bench.source}</td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                          {bench.manual_fallback || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {editingId === bench.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(bench.id)}
                              className="text-green-600 hover:text-green-700 font-medium text-xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-red-600 hover:text-red-700 font-medium text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingId(bench.id);
                              setEditValue(bench.spot_price);
                            }}
                            className="text-primary-800 hover:text-primary-900"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {benchmarks.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-600 font-medium">No benchmarks configured</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Manual Entry & Source Management */}
        <div className="space-y-6">
          {/* Manual Price Entry */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-slate-900 mb-4">Manual Price Entry</h3>

            <div className="space-y-4">
              <div>
                <label className="form-label">Metal</label>
                <select value={manualInput.metal} onChange={(e) => setManualInput({ ...manualInput, metal: e.target.value })} className="form-input">
                  <option value="">Select metal...</option>
                  {benchmarks.map(b => (
                    <option key={b.id} value={b.metal_code}>{b.metal_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Price</label>
                <input
                  type="number"
                  value={manualInput.price}
                  onChange={(e) => setManualInput({ ...manualInput, price: e.target.value })}
                  className="form-input"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="form-label">Note</label>
                <textarea
                  value={manualInput.note}
                  onChange={(e) => setManualInput({ ...manualInput, note: e.target.value })}
                  className="form-input"
                  rows="3"
                  placeholder="Reason for override..."
                ></textarea>
              </div>

              <button className="btn-primary w-full">Override Price</button>
            </div>
          </div>

          {/* Source Management */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-slate-900 mb-4">Data Sources</h3>

            <div className="space-y-3">
              {['LME', 'SHFE', 'NYMEX', 'Local Supplier'].map(source => (
                <div key={source} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <div>
                    <p className="font-medium text-slate-900">{source}</p>
                    <p className="text-xs text-slate-600">Last update: 2 hours ago</p>
                  </div>
                  <button
                    onClick={() => handleTestConnection(source)}
                    className="text-primary-800 hover:text-primary-900"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button className="btn-secondary w-full mt-4">Configure Sources</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BenchmarkSettings;
