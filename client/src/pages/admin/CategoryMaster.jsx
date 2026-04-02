import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAdminCategories, createCategory, updateCategory } from '../../api';
import LoadingSpinner from '../../components/LoadingSpinner';

export const CategoryMaster = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    quotation_types: [],
    effective_from: '',
    effective_to: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await getAdminCategories();
      setCategories(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load categories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateCategory(editingId, formData);
        toast.success('Category updated');
      } else {
        await createCategory(formData);
        toast.success('Category created');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        quotation_types: [],
        effective_from: '',
        effective_to: ''
      });
      fetchCategories();
    } catch (err) {
      toast.error('Failed to save category');
      console.error(err);
    }
  };

  const handleEdit = (category) => {
    setEditingId(category.id);
    setFormData(category);
    setShowForm(true);
  };

  if (loading) {
    return <LoadingSpinner message="Loading categories..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Category Master</h2>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              code: '',
              name: '',
              description: '',
              quotation_types: [],
              effective_from: '',
              effective_to: ''
            });
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            {editingId ? 'Edit Category' : 'New Category'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="form-input"
                  placeholder="e.g., CU/AG"
                  required
                />
              </div>

              <div>
                <label className="form-label">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  placeholder="Category name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-input"
                rows="3"
                placeholder="Category description"
              ></textarea>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">Effective From</label>
                <input
                  type="date"
                  value={formData.effective_from}
                  onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Effective To</label>
                <input
                  type="date"
                  value={formData.effective_to}
                  onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Quotation Types</label>
                <input
                  type="text"
                  value={(formData.quotation_types || []).join(', ')}
                  onChange={(e) => setFormData({ ...formData, quotation_types: e.target.value.split(',').map(s => s.trim()) })}
                  className="form-input"
                  placeholder="Comma separated"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-200">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Category
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-slate-600 font-semibold">
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Types</th>
                <th className="px-6 py-4">Effective Period</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {categories.map(cat => (
                <tr key={cat.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-900">{cat.code}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{cat.name}</td>
                  <td className="px-6 py-4 text-slate-600">{cat.description}</td>
                  <td className="px-6 py-4 text-slate-600">
                    <div className="flex gap-1 flex-wrap">
                      {(cat.quotation_types || []).map(type => (
                        <span key={type} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded">
                          {type}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">
                    {cat.effective_from && new Date(cat.effective_from).toLocaleDateString()}
                    {cat.effective_to && ` - ${new Date(cat.effective_to).toLocaleDateString()}`}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEdit(cat)}
                        className="text-primary-800 hover:text-primary-900"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="text-slate-600 hover:text-slate-900">
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600 font-medium">No categories found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryMaster;
