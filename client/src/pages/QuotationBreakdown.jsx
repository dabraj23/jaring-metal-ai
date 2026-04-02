import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { getQuotation, getBreakdown, submitForApproval, getDocuments } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import WorkflowStepper from '../components/WorkflowStepper';

export const QuotationBreakdown = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quotRes, breakdownRes, docsRes] = await Promise.all([
        getQuotation(id),
        getBreakdown(id),
        getDocuments(id)
      ]);
      setQuotation(quotRes.data);
      setBreakdown(breakdownRes.data);
      setDocuments(docsRes.data?.data || []);
    } catch (err) {
      toast.error('Failed to load quotation breakdown');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    try {
      setSubmitting(true);
      await submitForApproval(id);
      toast.success('Quotation submitted for approval');
      fetchData();
    } catch (err) {
      toast.error('Failed to submit quotation');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading quotation breakdown..." />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <WorkflowStepper currentStatus={quotation?.status || 'reviewed'} />

      {/* Header Card */}
      <div className="bg-gradient-to-r from-primary-800 to-primary-900 rounded-lg shadow-lg p-8 text-white">
        <div className="grid grid-cols-4 gap-8">
          <div>
            <p className="text-primary-100 text-sm font-medium mb-1">Reference</p>
            <p className="text-2xl font-bold">{quotation?.reference}</p>
          </div>
          <div>
            <p className="text-primary-100 text-sm font-medium mb-1">Customer</p>
            <p className="text-2xl font-bold">{quotation?.customer_name}</p>
          </div>
          <div>
            <p className="text-primary-100 text-sm font-medium mb-1">Type</p>
            <p className="text-lg font-bold">{quotation?.quotation_type}</p>
          </div>
          <div>
            <p className="text-primary-100 text-sm font-medium mb-1">Status</p>
            <p className="text-lg font-bold capitalize">{quotation?.status}</p>
          </div>
        </div>
      </div>

      {/* Section 1: Documents & Extracted Data */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Documents & Extracted Data
        </h3>

        <div className="mb-6">
          <p className="text-sm font-semibold text-slate-600 mb-3">Source Documents</p>
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                <span className="text-slate-900 font-medium">{doc.file_name}</span>
                <span className="text-sm text-slate-600">{(doc.file_size / 1024).toFixed(0)} KB</span>
              </div>
            ))}
          </div>
        </div>

        {breakdown?.extracted_data && (
          <div>
            <p className="text-sm font-semibold text-slate-600 mb-3">Key Values</p>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(breakdown.extracted_data).map(([key, value]) => (
                <div key={key} className="p-3 bg-slate-50 rounded">
                  <p className="text-xs text-slate-600 capitalize">{key.replace(/_/g, ' ')}</p>
                  <p className="text-lg font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Market Benchmarks */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Market Benchmarks Used</h3>

        {breakdown?.benchmarks && breakdown.benchmarks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr className="text-left text-slate-600 font-semibold">
                  <th className="pb-3">Metal</th>
                  <th className="pb-3">Price</th>
                  <th className="pb-3">Unit</th>
                  <th className="pb-3">Source</th>
                  <th className="pb-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {breakdown.benchmarks.map(bench => (
                  <tr key={bench.id}>
                    <td className="py-3 font-medium text-slate-900">{bench.metal_name}</td>
                    <td className="py-3 text-slate-900 font-semibold">{bench.price}</td>
                    <td className="py-3 text-slate-600">{bench.unit}</td>
                    <td className="py-3 text-slate-600">{bench.source}</td>
                    <td className="py-3 text-slate-600 text-xs">
                      {new Date(bench.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-600">No benchmarks available</p>
        )}
      </div>

      {/* Section 3: Formula & Calculation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Formula & Calculation</h3>

        {breakdown?.formula && (
          <div className="mb-6 p-4 bg-slate-50 rounded border border-slate-200">
            <p className="text-sm font-semibold text-slate-600 mb-2">Formula</p>
            <p className="font-mono text-sm text-slate-900">{breakdown.formula.name} (v{breakdown.formula.version})</p>
            <p className="font-mono text-xs text-slate-600 mt-2">{breakdown.formula.expression}</p>
          </div>
        )}

        {breakdown?.calculation_steps && breakdown.calculation_steps.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-semibold text-slate-600 mb-3">Calculation Breakdown</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200">
                  <tr className="text-left text-slate-600 font-semibold">
                    <th className="pb-3">Step</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {breakdown.calculation_steps.map((step, idx) => (
                    <tr key={idx}>
                      <td className="py-3">{idx + 1}</td>
                      <td className="py-3 text-slate-600">{step.description}</td>
                      <td className="py-3 text-right text-slate-900 font-semibold">{step.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Deductions */}
        {breakdown?.deductions && breakdown.deductions.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 rounded border border-red-200">
            <p className="text-sm font-semibold text-red-900 mb-3">Deductions</p>
            <div className="space-y-2">
              {breakdown.deductions.map((ded, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-red-800">{ded.name}</span>
                  <span className="text-red-900 font-semibold">-{ded.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tax */}
        {breakdown?.tax && (
          <div className="mb-6 p-4 bg-orange-50 rounded border border-orange-200">
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-orange-900">Tax</span>
              <span className="text-orange-900 font-semibold">{breakdown.tax}</span>
            </div>
          </div>
        )}

        {/* Final Price */}
        <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-300">
          <p className="text-sm font-semibold text-green-900 mb-2">Final Price</p>
          <p className="text-5xl font-bold text-green-700">{breakdown?.final_price || '0.00'}</p>
          <p className="text-xs text-green-800 mt-2">Total amount payable</p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6 flex gap-4">
        <button
          onClick={() => navigate(`/quotations/${id}/market-data`)}
          className="btn-secondary"
        >
          Back
        </button>
        {quotation?.status === 'reviewed' && (
          <button
            onClick={handleSubmitForApproval}
            disabled={submitting}
            className="btn-primary"
          >
            {submitting ? 'Submitting...' : 'Submit for Approval'}
          </button>
        )}
        {quotation?.status === 'pending_approval' && (
          <button
            onClick={() => navigate(`/quotations/${id}/approval`)}
            className="btn-primary"
          >
            Review Approval
          </button>
        )}
      </div>
    </div>
  );
};

export default QuotationBreakdown;
