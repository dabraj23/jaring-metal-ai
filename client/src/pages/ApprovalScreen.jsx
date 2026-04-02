import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getQuotation, getAuditTrail, approveQuotation, rejectQuotation } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import WorkflowStepper from '../components/WorkflowStepper';

export const ApprovalScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quotRes, auditRes] = await Promise.all([
        getQuotation(id),
        getAuditTrail(id)
      ]);
      setQuotation(quotRes.data);
      setAuditTrail(auditRes.data?.data || []);
    } catch (err) {
      toast.error('Failed to load quotation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setApproving(true);
      await approveQuotation(id, { comment: approvalComment });
      toast.success('Quotation approved');
      setShowApproveModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to approve quotation');
      console.error(err);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setRejecting(true);
      await rejectQuotation(id, { reason: rejectionReason });
      toast.success('Quotation rejected');
      setShowRejectModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to reject quotation');
      console.error(err);
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading approval details..." />;
  }

  const checklist = [
    { label: 'Documents uploaded', status: !!quotation?.documents_count },
    { label: 'AI extraction reviewed', status: quotation?.status !== 'uploaded' },
    { label: 'Category confirmed', status: quotation?.category_id },
    { label: 'Benchmarks snapshot taken', status: quotation?.status !== 'reviewed' },
    { label: 'Formula applied', status: !!quotation?.breakdown_id }
  ];

  const allChecklistPassed = checklist.every(item => item.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <WorkflowStepper currentStatus={quotation?.status || 'pending_approval'} />

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-primary-800 to-primary-900 rounded-lg shadow-lg p-8 text-white">
        <div className="grid grid-cols-3 gap-8">
          <div>
            <p className="text-primary-100 text-sm font-medium mb-1">Reference</p>
            <p className="text-2xl font-bold">{quotation?.reference}</p>
          </div>
          <div>
            <p className="text-primary-100 text-sm font-medium mb-1">Customer</p>
            <p className="text-2xl font-bold">{quotation?.customer_name}</p>
          </div>
          <div>
            <p className="text-primary-100 text-sm font-medium mb-1">Final Price</p>
            <p className="text-3xl font-bold">{quotation?.final_price || '0.00'}</p>
          </div>
        </div>
      </div>

      {/* Approval Checklist */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Approval Checklist</h3>

        <div className="space-y-3 mb-6">
          {checklist.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded">
              {item.status ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <span className={item.status ? 'text-slate-900 font-medium' : 'text-slate-600'}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div className={`p-4 rounded-lg ${allChecklistPassed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={allChecklistPassed ? 'text-green-900 font-semibold' : 'text-red-900 font-semibold'}>
            {allChecklistPassed ? 'All requirements met - ready for approval' : 'Some requirements not met'}
          </p>
        </div>
      </div>

      {/* Approval History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Activity Timeline</h3>

        <div className="relative">
          {auditTrail.length > 0 ? (
            <div className="space-y-4">
              {auditTrail.map((entry, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-primary-800 rounded-full mt-2"></div>
                    {idx !== auditTrail.length - 1 && (
                      <div className="w-1 h-12 bg-slate-200 my-2"></div>
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="font-semibold text-slate-900">{entry.action}</p>
                    <p className="text-sm text-slate-600">{entry.user_name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(entry.created_at).toLocaleString()}
                    </p>
                    {entry.comment && (
                      <p className="text-sm text-slate-700 mt-2 p-2 bg-slate-50 rounded italic">
                        {entry.comment}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-600">No activity yet</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {quotation?.status === 'pending_approval' && (
        <div className="bg-white rounded-lg shadow p-6 flex gap-4">
          <button
            onClick={() => navigate(`/quotations/${id}`)}
            className="btn-secondary"
          >
            Back to Details
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            className="btn-danger"
          >
            Reject
          </button>
          <button
            onClick={() => setShowApproveModal(true)}
            disabled={!allChecklistPassed}
            className="btn-success disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Approve
          </button>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Confirm Approval</h3>

            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-900">
                Are you sure you want to approve this quotation for customer <strong>{quotation?.customer_name}</strong>?
              </p>
            </div>

            <div className="mb-4">
              <label className="form-label">Optional Comment</label>
              <textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                className="form-input"
                rows="3"
                placeholder="Add any comments..."
              ></textarea>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowApproveModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="btn-success flex-1"
              >
                {approving ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Reject Quotation</h3>

            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-900">
                Please provide a reason for rejecting this quotation.
              </p>
            </div>

            <div className="mb-4">
              <label className="form-label">Rejection Reason</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="form-input"
                rows="4"
                placeholder="Explain why this quotation is being rejected..."
              ></textarea>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting}
                className="btn-danger flex-1"
              >
                {rejecting ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalScreen;
