import React, { useState, useEffect } from 'react';
import { Plus, Edit2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAdminFormulas, createFormula } from '../../api';
import LoadingSpinner from '../../components/LoadingSpinner';

export const FormulaMaster = () => {
  const [formulas, setFormulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    expression: '',
    description: ''
  });

  useEffect(() => {
    fetchFormulas();
  }, []);

  const fetchFormulas = async () => {
    try {
      setLoading(true);
      const res = await getAdminFormulas();
      setFormulas(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load formulas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createFormula(formData);
      toast.success('Formula created');
      setShowForm(false);
      setFormData({
        name: '',
        category_id: '',
        expression: '',
        description: ''
      });
      fetchFormulas();
    } catch (err) {
      toast.error('Failed to create formula');
      console.error(err);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading formulas..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Formula Master</h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Formula
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">New Formula</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Formula Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  placeholder="e.g., Cu Recovery v1"
                  required
                />
              </div>

              <div>
                <label className="form-label">Category</label>
                <input
                  type="text"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="form-input"
                  placeholder="Category ID"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Expression</label>
              <textarea
                value={formData.expression}
                onChange={(e) => setFormData({ ...formData, expression: e.target.value })}
                className="form-input font-mono"
                rows="5"
                placeholder="e.g., (weight * purity * price) - (weight * loss_factor)"
                required
              ></textarea>
            </div>

            <div>
              <label className="form-label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-input"
                rows="3"
                placeholder="Formula description"
              ></textarea>
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-200">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Formula
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Formulas List */}
      <div className="space-y-4">
        {formulas.map(formula => (
          <div key={formula.id} className="bg-white rounded-lg shadow">
            <button
              onClick={() => setExpandedId(expandedId === formula.id ? null : formula.id)}
              className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex-1 text-left">
                <h3 className="font-bold text-slate-900">{formula.name}</h3>
                <p className="text-sm text-slate-600">{formula.versions?.length || 0} version(s)</p>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform ${
                  expandedId === formula.id ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedId === formula.id && (
              <div className="border-t border-slate-200 p-6 space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase mb-2">Current Expression</p>
                  <div className="bg-slate-50 p-4 rounded font-mono text-sm text-slate-900 break-all">
                    {formula.expression}
                  </div>
                </div>

                {formula.description && (
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase mb-2">Description</p>
                    <p className="text-slate-700">{formula.description}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase mb-3">Version History</p>
                  <div className="space-y-2">
                    {(formula.versions || []).map((v, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                        <div>
                          <p className="font-medium text-slate-900">Version {v.version_number}</p>
                          <p className="text-xs text-slate-600">{new Date(v.created_at).toLocaleDateString()}</p>
                        </div>
                        <button className="text-primary-800 hover:text-primary-900 font-medium text-sm">
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-200">
                  <button className="btn-primary flex-1">Add Version</button>
                  <button className="btn-secondary flex-1">Compare Versions</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {formulas.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-slate-600 font-medium">No formulas found</p>
        </div>
      )}
    </div>
  );
};

export default FormulaMaster;
