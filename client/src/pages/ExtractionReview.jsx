import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit2, Save, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getExtracted, updateExtractedField, getDocuments, getQuotation } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfidenceBadge from '../components/ConfidenceBadge';
import WorkflowStepper from '../components/WorkflowStepper';

export const ExtractionReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [extractedData, setExtractedData] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (documents.length > 0 && !selectedDoc) {
      setSelectedDoc(documents[0]);
    }
  }, [documents]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quotRes, docsRes, extractedRes] = await Promise.all([
        getQuotation(id),
        getDocuments(id),
        getExtracted(id)
      ]);
      setQuotation(quotRes.data);
      setDocuments(docsRes.data?.data || []);
      setExtractedData(extractedRes.data?.data || []);
    } catch (err) {
      toast.error('Failed to load extraction data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditField = (fieldId, value) => {
    setEditingField(fieldId);
    setEditValue(value);
  };

  const handleSaveField = async (fieldId) => {
    try {
      await updateExtractedField(id, fieldId, { value: editValue });
      toast.success('Field updated');
      setEditingField(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to update field');
      console.error(err);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading extraction data..." />;
  }

  const selectedDocData = extractedData.find(d => d.document_id === selectedDoc?.id);
  const fields = selectedDocData?.fields || [];

  const metalFields = fields.filter(f => ['cu', 'ag', 'au', 'pd', 'ni', 'sn'].includes(f.field_name.toLowerCase()));
  const lowConfidenceFields = fields.filter(f => f.confidence < 0.7);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <WorkflowStepper currentStatus={quotation?.status || 'extracted'} />

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
            <p className="text-slate-600 text-sm font-medium">Documents</p>
            <p className="text-slate-900 font-bold">{documents.length}</p>
          </div>
          <div>
            <p className="text-slate-600 text-sm font-medium">Extracted Fields</p>
            <p className="text-slate-900 font-bold">{fields.length}</p>
          </div>
        </div>
      </div>

      {/* Low Confidence Alert */}
      {lowConfidenceFields.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-900">Low Confidence Fields</h4>
            <p className="text-sm text-yellow-800 mt-1">
              {lowConfidenceFields.length} field(s) have confidence below 70%. Please review and correct as needed.
            </p>
          </div>
        </div>
      )}

      {/* Content Layout */}
      <div className="grid grid-cols-4 gap-6">
        {/* Document Selector */}
        <div className="bg-white rounded-lg shadow p-4 h-fit">
          <h3 className="font-bold text-slate-900 mb-3 text-sm">Documents</h3>
          <div className="space-y-2">
            {documents.map(doc => (
              <button
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${
                  selectedDoc?.id === doc.id
                    ? 'bg-primary-800 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <p className="truncate">{doc.file_name}</p>
                <p className="text-xs opacity-75">{(doc.file_size / 1024).toFixed(0)} KB</p>
              </button>
            ))}
          </div>
        </div>

        {/* Extracted Fields */}
        <div className="col-span-3 bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-slate-900 mb-4">Extracted Data</h3>

          {fields.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200">
                  <tr className="text-left text-slate-600 font-semibold">
                    <th className="pb-3">Field</th>
                    <th className="pb-3">Extracted Value</th>
                    <th className="pb-3">Confidence</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fields.map(field => (
                    <tr key={field.id} className={field.confidence < 0.7 ? 'bg-yellow-50' : ''}>
                      <td className="py-3 font-medium text-slate-900">{field.field_name}</td>
                      <td className="py-3">
                        {editingField === field.id ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="form-input"
                          />
                        ) : (
                          <span className="text-slate-700">{field.value || '—'}</span>
                        )}
                      </td>
                      <td className="py-3">
                        <ConfidenceBadge score={field.confidence} />
                      </td>
                      <td className="py-3">
                        {editingField === field.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveField(field.id)}
                              className="text-green-600 hover:text-green-700 p-1"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingField(null)}
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditField(field.id, field.value)}
                            className="text-primary-800 hover:text-primary-900 p-1"
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
          ) : (
            <p className="text-slate-600 text-center py-8">No extracted data available</p>
          )}
        </div>
      </div>

      {/* Metal Results */}
      {metalFields.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-slate-900 mb-4">Metal Results</h3>
          <div className="grid grid-cols-6 gap-4">
            {metalFields.map(field => (
              <div key={field.id} className="border border-slate-200 rounded-lg p-4 text-center">
                <p className="font-bold text-lg text-primary-800">{field.field_name.toUpperCase()}</p>
                <p className="text-slate-900 font-semibold my-2">{field.value || '—'}</p>
                <ConfidenceBadge score={field.confidence} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6 flex gap-4">
        <button
          onClick={() => navigate(`/quotations/${id}/documents`)}
          className="btn-secondary"
        >
          Back
        </button>
        <button
          onClick={() => navigate(`/quotations/${id}/category`)}
          className="btn-primary"
        >
          Confirm Data & Continue
        </button>
      </div>
    </div>
  );
};

export default ExtractionReview;
