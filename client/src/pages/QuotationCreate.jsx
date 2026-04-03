import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { createQuotation, getCustomers } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';

export const QuotationCreate = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, control, formState: { isSubmitting, errors } } = useForm();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await getCustomers();
      setCustomers(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (err) {
      toast.error('Failed to load customers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const res = await createQuotation({
        customer_id: data.customer_id,
        quotation_type: data.quotation_type,
        quote_date: data.quote_date,
        validity_period: parseInt(data.validity_period),
        shipment_month: data.shipment_month,
        pricing_mode: data.pricing_mode,
        notes: data.notes
      });

      toast.success('Quotation created successfully');
      navigate(`/quotations/${res.data.id}/documents`);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to create quotation';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Stepper */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-primary-800 text-white rounded-full flex items-center justify-center font-bold">1</div>
            <span className="text-xs font-medium text-primary-800 mt-2">Request</span>
          </div>
          <div className="flex-1 h-1 bg-slate-300 mx-2"></div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-slate-300 text-slate-600 rounded-full flex items-center justify-center font-bold">2</div>
            <span className="text-xs font-medium text-slate-600 mt-2">Documents</span>
          </div>
          <div className="flex-1 h-1 bg-slate-300 mx-2"></div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-slate-300 text-slate-600 rounded-full flex items-center justify-center font-bold">3</div>
            <span className="text-xs font-medium text-slate-600 mt-2">Extract</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Create New Quotation</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer */}
          <div>
            <label className="form-label">Customer</label>
            <select
              {...register('customer_id', { required: 'Customer is required' })}
              className="form-input"
            >
              <option value="">Select a customer...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.customer_id && <p className="text-red-600 text-sm mt-1">{errors.customer_id.message}</p>}
          </div>

          {/* Quotation Type */}
          <div>
            <label className="form-label">Quotation Type</label>
            <select
              {...register('quotation_type', { required: 'Quotation type is required' })}
              className="form-input"
            >
              <option value="">Select type...</option>
              <option value="Monthly Quotation">Monthly Quotation</option>
              <option value="Formula Quotation">Formula Quotation</option>
              <option value="Recovery Settlement">Recovery Settlement</option>
            </select>
            {errors.quotation_type && <p className="text-red-600 text-sm mt-1">{errors.quotation_type.message}</p>}
          </div>

          {/* Quote Date */}
          <div>
            <label className="form-label">Quote Date</label>
            <input
              type="date"
              {...register('quote_date', { required: 'Quote date is required' })}
              className="form-input"
            />
            {errors.quote_date && <p className="text-red-600 text-sm mt-1">{errors.quote_date.message}</p>}
          </div>

          {/* Validity Period */}
          <div>
            <label className="form-label">Validity Period (days)</label>
            <input
              type="number"
              {...register('validity_period', { required: 'Validity period is required' })}
              className="form-input"
              placeholder="30"
            />
            {errors.validity_period && <p className="text-red-600 text-sm mt-1">{errors.validity_period.message}</p>}
          </div>

          {/* Shipment Month */}
          <div>
            <label className="form-label">Shipment/Pricing Month</label>
            <input
              type="month"
              {...register('shipment_month', { required: 'Shipment month is required' })}
              className="form-input"
            />
            {errors.shipment_month && <p className="text-red-600 text-sm mt-1">{errors.shipment_month.message}</p>}
          </div>

          {/* Pricing Mode */}
          <div>
            <label className="form-label">Pricing Mode</label>
            <select
              {...register('pricing_mode', { required: 'Pricing mode is required' })}
              className="form-input"
            >
              <option value="">Select mode...</option>
              <option value="spot">Spot</option>
              <option value="forward">Forward</option>
              <option value="scenario">Scenario</option>
            </select>
            {errors.pricing_mode && <p className="text-red-600 text-sm mt-1">{errors.pricing_mode.message}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="form-label">Notes</label>
            <textarea
              {...register('notes')}
              className="form-input"
              rows="4"
              placeholder="Additional notes..."
            ></textarea>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate('/quotations')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? 'Creating...' : 'Create Quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuotationCreate;
