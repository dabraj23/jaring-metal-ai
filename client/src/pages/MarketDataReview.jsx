import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RefreshCw, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getMarketData, fetchMarketData, overrideMarketData, getQuotation } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import WorkflowStepper from '../components/WorkflowStepper';

export const MarketDataReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [benchmarks, setBenchmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingBench, setEditingBench] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [targetMonth, setTargetMonth] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quotRes, dataRes] = await Promise.all([
        getQuotation(id),
        getMarketData()
      ]);
      setQuotation(quotRes.data);
      setBenchmarks(dataRes.data?.data || []);

      // Set target month from quotation if it's forward pricing
      if (quotRes.data.pricing_mode === 'forward' && quotRes.data.shipment_month) {
        setTargetMonth(quotRes.data.shipment_month);
      }
    } catch (err) {
      toast.error('Failed to load market data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchMarketData();
      toast.success('Market data refreshed');
      fetchData();
    } catch (err) {
      toast.error('Failed to refresh market data');
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOverride = async (benchId) => {
    try {
      await overrideMarketData({
        benchmark_id: benchId,
        override_price: parseFloat(editValue),
        note: 'Manual override'
      });
      toast.success('Benchmark overridden');
      setEditingBench(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to override benchmark');
      console.error(err);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading market data..." />;
  }

  const isDataFresh = (timestamp) => {
    const diff = new Date() - new Date(timestamp);
    return diff < 24 * 60 * 60 * 1000;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <WorkflowStepper currentStatus={quotation?.status || 'reviewed'} />

      {/* Quotation Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-slate-600 text-sm font-medium">Reference</p>
            <p className="text-slate-900 font-bold">{quotation?.reference}</p>
          </div>
          <div>
            <p className="text-slate-600 text-sm font-medium">Customer</p>
            <p className="text-slate-900 font-bold">{quotation?.customer_name}</p>
          </div>
          <div>
            <p className="text-slate-600 text-sm font-medium">Pricing Mode</p>
            <p className="text-slate-900 font-bold capitalize">{quotation?.pricing_mode}</p>
          </div>
          <div>
            <p className="text-slate-600 text-sm font-medium">Shipment Month</p>
            <p className="text-slate-900 font-bold">{quotation?.shipment_month}</p>
          </div>
        </div>
      </div>

      {/* Benchmarks Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Market Benchmarks</h3>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-slate-200 text-slate-900 rounded hover:bg-slate-300 font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200">
              <tr className="text-left text-slate-600 font-semibold">
                <th className="pb-3">Metal</th>
                <th className="pb-3">Code</th>
                <th className="pb-3">Price</th>
                <th className="pb-3">Unit</th>
                <th className="pb-3">Source</th>
                <th className="pb-3">Fetched</th>
                <th className="pb-3">Basis</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {benchmarks.map(bench => (
                <tr key={bench.id} className={isDataFresh(bench.fetched_at) ? '' : 'bg-yellow-50'}>
                  <td className="py-3 font-medium text-slate-900">{bench.metal_name}</td>
                  <td className="py-3 text-slate-600">{bench.metal_code}</td>
                  <td className="py-3 text-slate-900 font-semibold">
                    {editingBench === bench.id ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="form-input w-24"
                      />
                    ) : (
                      `${bench.spot_price}`
                    )}
                  </td>
                  <td className="py-3 text-slate-600">{bench.unit}</td>
                  <td className="py-3 text-slate-600">{bench.source}</td>
                  <td className="py-3 text-slate-600 text-xs">
                    {new Date(bench.fetched_at).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      isDataFresh(bench.fetched_at)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {isDataFresh(bench.fetched_at) ? 'Fresh' : 'Older'}
                    </span>
                  </td>
                  <td className="py-3">
                    {editingBench === bench.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOverride(bench.id)}
                          className="text-green-600 hover:text-green-700 font-medium text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingBench(null)}
                          className="text-red-600 hover:text-red-700 font-medium text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingBench(bench.id);
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
      </div>

      {/* Forward Pricing Section */}
      {quotation?.pricing_mode === 'forward' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Forward Pricing</h3>

          <div>
            <label className="form-label">Target Month</label>
            <input
              type="month"
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
              className="form-input max-w-xs"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6 flex gap-4">
        <button
          onClick={() => navigate(`/quotations/${id}/category`)}
          className="btn-secondary"
        >
          Back
        </button>
        <button
          onClick={() => navigate(`/quotations/${id}`)}
          className="btn-primary"
        >
          Snapshot & Continue
        </button>
      </div>
    </div>
  );
};

export default MarketDataReview;
