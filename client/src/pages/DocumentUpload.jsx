import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadDocument, getDocuments, extractData, getQuotation } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import WorkflowStepper from '../components/WorkflowStepper';

export const DocumentUpload = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchQuotationAndDocuments();
  }, [id]);

  const fetchQuotationAndDocuments = async () => {
    try {
      setLoading(true);
      const [quotRes, docsRes] = await Promise.all([
        getQuotation(id),
        getDocuments(id)
      ]);
      setQuotation(quotRes.data);
      setDocuments(docsRes.data?.data || []);
    } catch (err) {
      toast.error('Failed to load quotation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  };

  const handleFiles = async (files) => {
    for (const file of files) {
      if (!['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'].includes(file.type)) {
        toast.error(`${file.name} is not a supported file type`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);

        await uploadDocument(id, formData);
        toast.success(`${file.name} uploaded successfully`);
        fetchQuotationAndDocuments();
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
        console.error(err);
      }
    }
  };

  const handleExtract = async () => {
    try {
      setExtracting(true);
      await extractData(id);
      toast.success('Data extraction complete');
      setTimeout(() => {
        navigate(`/quotations/${id}/extraction`);
      }, 1000);
    } catch (err) {
      toast.error('Extraction failed');
      console.error(err);
    } finally {
      setExtracting(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    // Delete functionality would be implemented if backend supports it
    toast.info('Document deletion not yet implemented');
  };

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <WorkflowStepper currentStatus={quotation?.status || 'draft'} />

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
            <p className="text-slate-600 text-sm font-medium">Type</p>
            <p className="text-slate-900 font-bold">{quotation?.quotation_type}</p>
          </div>
          <div>
            <p className="text-slate-600 text-sm font-medium">Status</p>
            <p className="text-slate-900 font-bold capitalize">{quotation?.status}</p>
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Upload Documents</h3>

        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            dragActive ? 'border-primary-800 bg-primary-50' : 'border-slate-300 hover:border-primary-800'
          }`}
        >
          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-slate-900 mb-2">
            Drag and drop files here
          </h4>
          <p className="text-slate-600 mb-4">
            or click to select files
          </p>
          <label>
            <input
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={(e) => handleFiles(Array.from(e.target.files))}
              className="hidden"
            />
            <span className="btn-primary">Choose Files</span>
          </label>
          <p className="text-xs text-slate-500 mt-4">
            Supported: PDF, XLSX, XLS, CSV (Max 10MB per file)
          </p>
        </div>
      </div>

      {/* Uploaded Documents */}
      {documents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Uploaded Documents</h3>

          <div className="space-y-3">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{doc.file_name}</p>
                    <p className="text-sm text-slate-600">{(doc.file_size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {doc.status === 'extracted' ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-600 font-medium">Extracted</span>
                    </>
                  ) : doc.status === 'extracting' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primary-800 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-primary-800 font-medium">Extracting</span>
                    </>
                  ) : doc.status === 'failed' ? (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm text-red-600 font-medium">Failed</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 text-slate-400" />
                      <span className="text-sm text-slate-600">Uploaded</span>
                    </>
                  )}
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
        <button
          onClick={handleExtract}
          disabled={documents.length === 0 || extracting}
          className="btn-primary"
        >
          {extracting ? 'Analyzing documents with Gemini AI...' : 'Extract Data with AI'}
        </button>
      </div>
    </div>
  );
};

export default DocumentUpload;
