import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Share2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { getQuotation, generateOutput, releaseQuotation } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';

export const OutputPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [outputs, setOutputs] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getQuotation(id);
      setQuotation(res.data);
      setOutputs(res.data?.outputs || []);
    } catch (err) {
      toast.error('Failed to load quotation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await generateOutput(id);
      toast.success('Output generated');
      fetchData();
    } catch (err) {
      toast.error('Failed to generate output');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleRelease = async () => {
    try {
      setReleasing(true);
      await releaseQuotation(id);
      toast.success('Quotation released to customer');
      fetchData();
    } catch (err) {
      toast.error('Failed to release quotation');
      console.error(err);
    } finally {
      setReleasing(false);
    }
  };

  const handleDownload = (format) => {
    // Download functionality would be implemented with actual file generation
    toast.info(`Download as ${format.toUpperCase()} not yet implemented`);
  };

  if (loading) {
    return <LoadingSpinner message="Loading output preview..." />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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
            <p className="text-slate-600 text-sm font-medium">Status</p>
            <p className="text-slate-900 font-bold capitalize">{quotation?.status}</p>
          </div>
          <div>
            <p className="text-slate-600 text-sm font-medium">Final Price</p>
            <p className="text-slate-900 font-bold text-lg">{quotation?.final_price || '0.00'}</p>
          </div>
        </div>
      </div>

      {/* Quotation Preview */}
      <div className="bg-white rounded-lg shadow p-12 border-2 border-slate-200 min-h-[600px]">
        <div className="text-center mb-12 pb-8 border-b border-slate-300">
          <div className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-2">
            JARING METAL SDN BHD
          </div>
          <h1 className="text-3xl font-bold text-slate-900">QUOTATION</h1>
          <p className="text-slate-600 mt-2">AI Quotation Intelligence Platform</p>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs uppercase font-bold text-slate-600 mb-1">Quotation Reference</p>
            <p className="text-lg font-bold text-slate-900">{quotation?.reference}</p>

            <p className="text-xs uppercase font-bold text-slate-600 mt-6 mb-1">Quote Date</p>
            <p className="text-slate-900">{quotation?.quote_date ? new Date(quotation.quote_date).toLocaleDateString() : '—'}</p>

            <p className="text-xs uppercase font-bold text-slate-600 mt-6 mb-1">Validity Period</p>
            <p className="text-slate-900">{quotation?.validity_period} days</p>
          </div>

          <div>
            <p className="text-xs uppercase font-bold text-slate-600 mb-1">Customer</p>
            <p className="text-lg font-bold text-slate-900">{quotation?.customer_name}</p>

            <p className="text-xs uppercase font-bold text-slate-600 mt-6 mb-1">Quotation Type</p>
            <p className="text-slate-900">{quotation?.quotation_type}</p>

            <p className="text-xs uppercase font-bold text-slate-600 mt-6 mb-1">Pricing Mode</p>
            <p className="text-slate-900 capitalize">{quotation?.pricing_mode}</p>
          </div>
        </div>

        {/* Amount */}
        <div className="bg-primary-50 border-2 border-primary-800 rounded-lg p-6 mt-12">
          <p className="text-xs uppercase font-bold text-primary-800 mb-2">Total Amount</p>
          <p className="text-4xl font-bold text-primary-800">{quotation?.final_price || '0.00'}</p>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-300 text-center text-xs text-slate-600">
          <p>This quotation is valid until {quotation?.validity_period} days from the quote date.</p>
          <p>Generated by Jaring Metal AI Quotation Intelligence Platform</p>
        </div>
      </div>

      {/* Download & Share */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Download & Share</h3>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => handleDownload('pdf')}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <button
            onClick={() => handleDownload('excel')}
            className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium"
          >
            <Download className="w-4 h-4" />
            Download Excel
          </button>
          <button
            onClick={() => toast.info('Email share not yet implemented')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium"
          >
            <Share2 className="w-4 h-4" />
            Share via Email
          </button>
        </div>
      </div>

      {/* Version History */}
      {outputs.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Version History</h3>

          <div className="space-y-3">
            {outputs.map((output, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded border border-slate-200">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900">Version {outputs.length - idx}</p>
                    <p className="text-sm text-slate-600">{new Date(output.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="text-primary-800 hover:text-primary-900 font-medium text-sm">View</button>
                  <button onClick={() => handleDownload('pdf')} className="text-slate-600 hover:text-slate-900 font-medium text-sm">Download</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6 flex gap-4">
        <button
          onClick={() => navigate(`/quotations/${id}`)}
          className="btn-secondary"
        >
          Back
        </button>
        {quotation?.status === 'approved' && (
          <>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary"
            >
              {generating ? 'Generating...' : 'Generate Output'}
            </button>
            <button
              onClick={handleRelease}
              disabled={releasing}
              className="btn-success"
            >
              {releasing ? 'Releasing...' : 'Release to Customer'}
            </button>
          </>
        )}
        {quotation?.status === 'released' && (
          <div className="flex-1 p-4 bg-green-50 rounded border border-green-200">
            <p className="text-green-900 font-semibold">This quotation has been released to the customer</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputPreview;
