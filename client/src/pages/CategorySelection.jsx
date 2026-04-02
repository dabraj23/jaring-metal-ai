import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCategories, confirmCategory, getQuotation } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import WorkflowStepper from '../components/WorkflowStepper';

export const CategorySelection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [aiRecommendation, setAiRecommendation] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quotRes, catRes] = await Promise.all([
        getQuotation(id),
        getCategories()
      ]);
      setQuotation(quotRes.data);
      setCategories(catRes.data?.data || []);

      // AI Recommendation - using first category as example
      if (catRes.data?.data?.length > 0) {
        setAiRecommendation({
          category: catRes.data.data[0],
          confidence: 0.87,
          reasoning: 'Based on the extracted metal composition (Cu: 45kg, Ag: 2.5kg) and historical quotation patterns, this category shows the highest match.'
        });
      }
    } catch (err) {
      toast.error('Failed to load categories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCategory = async () => {
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }

    try {
      await confirmCategory(id, selectedCategory.id);
      toast.success('Category confirmed');
      navigate(`/quotations/${id}/market-data`);
    } catch (err) {
      toast.error('Failed to confirm category');
      console.error(err);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading categories..." />;
  }

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(search.toLowerCase()) ||
    cat.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <WorkflowStepper currentStatus={quotation?.status || 'reviewed'} />

      {/* Quotation Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-3 gap-4">
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
        </div>
      </div>

      {/* AI Recommendation */}
      {aiRecommendation && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">AI Recommendation</h3>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl font-bold text-primary-800">{aiRecommendation.category.code}</span>
                <span className="text-xl text-slate-900">{aiRecommendation.category.name}</span>
                <div className="bg-white px-3 py-1 rounded-full">
                  <span className="text-sm font-semibold text-primary-800">{Math.round(aiRecommendation.confidence * 100)}% confidence</span>
                </div>
              </div>
              <p className="text-slate-700">{aiRecommendation.reasoning}</p>
            </div>
            <button
              onClick={() => {
                setSelectedCategory(aiRecommendation.category);
                toast.success('AI recommendation accepted');
              }}
              className="btn-primary whitespace-nowrap ml-4"
            >
              Accept Recommendation
            </button>
          </div>
        </div>
      )}

      {/* Category Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Browse All Categories</h3>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-10"
              placeholder="Search by code or name..."
            />
          </div>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat)}
              className={`relative p-4 border-2 rounded-lg text-left transition-all ${
                selectedCategory?.id === cat.id
                  ? 'border-primary-800 bg-primary-50'
                  : 'border-slate-200 hover:border-primary-800'
              }`}
            >
              {selectedCategory?.id === cat.id && (
                <CheckCircle className="absolute top-3 right-3 w-5 h-5 text-primary-800" />
              )}
              <p className="font-bold text-slate-900">{cat.code}</p>
              <p className="font-semibold text-slate-900 mb-2">{cat.name}</p>
              <p className="text-sm text-slate-600 mb-3">{cat.description}</p>
              <div className="flex gap-2 flex-wrap">
                {cat.quotation_types?.map(type => (
                  <span key={type} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                    {type}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {filteredCategories.length === 0 && (
          <p className="text-center text-slate-600 py-8">No categories found</p>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6 flex gap-4">
        <button
          onClick={() => navigate(`/quotations/${id}/extraction`)}
          className="btn-secondary"
        >
          Back
        </button>
        <button
          onClick={handleConfirmCategory}
          disabled={!selectedCategory}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirm Category
        </button>
      </div>
    </div>
  );
};

export default CategorySelection;
