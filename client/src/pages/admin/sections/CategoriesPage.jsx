import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiToggleRight } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { getAllCategories, createCategory, updateCategory } from '../../../api/adminApi';
import Modal from '../../../components/admin/Modal';

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [form, setForm] = useState({ name: '', description: '', base_price: '', is_active: true });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getAllCategories();
      setCategories(res.data.data || []);
    } catch { } finally { setIsLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenModal = (cat = null) => {
    if (cat) {
      setEditingId(cat.id);
      setForm({ name: cat.name, description: cat.description || '', base_price: cat.base_price, is_active: cat.is_active });
    } else {
      setEditingId(null);
      setForm({ name: '', description: '', base_price: '', is_active: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = { ...form, base_price: Number(form.base_price) };
      if (editingId) {
        await updateCategory(editingId, payload);
        toast.success('Category updated');
      } else {
        await createCategory(payload);
        toast.success('Category created');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      await updateCategory(id, { is_active: !currentStatus });
      toast.success('Status updated');
      loadData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-dark">Service Categories</h1>
          <p className="text-sm text-gray-500">Manage available services and pricing.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary py-2 px-4 flex items-center gap-2 text-sm shadow-md hover:shadow-lg">
          <FiPlus /> Add New Category
        </button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-3 gap-4 animate-pulse">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-white rounded-2xl"></div>)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {categories.map(cat => (
            <div key={cat.id} className={`bg-white p-6 rounded-2xl shadow-sm border transition-all ${cat.is_active ? 'border-gray-100 hover:border-primary/50' : 'border-red-100 opacity-75'}`}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-dark">{cat.name}</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {cat.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2 h-10">{cat.description || 'No description provided.'}</p>
              <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                <span className="font-bold text-primary">₹{cat.base_price} base</span>
                <div className="flex gap-2">
                  <button onClick={() => handleToggle(cat.id, cat.is_active)} className="p-2 text-gray-400 hover:text-dark bg-gray-50 hover:bg-gray-100 rounded-lg transition" title="Toggle Status">
                    <FiToggleRight />
                  </button>
                  <button onClick={() => handleOpenModal(cat)} className="p-2 text-blue-500 hover:text-white bg-blue-50 hover:bg-blue-500 rounded-lg transition" title="Edit">
                    <FiEdit2 />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Category' : 'Create Category'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-dark mb-1">Service Name *</label>
            <input type="text" required className="w-full p-3 border border-gray-200 rounded-xl focus:border-primary focus:outline-none" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Towing" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-dark mb-1">Base Price (₹) *</label>
            <input type="number" required min="0" className="w-full p-3 border border-gray-200 rounded-xl focus:border-primary focus:outline-none" value={form.base_price} onChange={e => setForm({...form, base_price: e.target.value})} placeholder="e.g. 500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-dark mb-1">Description</label>
            <textarea className="w-full p-3 border border-gray-200 rounded-xl focus:border-primary focus:outline-none" rows="3" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe the service..." />
          </div>
          {!editingId && (
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-4 h-4 text-primary rounded" />
              <span className="text-sm font-medium text-dark">Activate immediately</span>
            </label>
          )}
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl disabled:opacity-50">
              {isSubmitting ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Category')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CategoriesPage;
