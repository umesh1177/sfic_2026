import React, { useState, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  Archive,
  Truck,
  Droplets,
  HelpCircle,
  ShieldAlert,
  Waves,
  Sparkles,
  TreePine,
  Search,
  Plus,
  Edit,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  Table,
  Clock,
  Flame,
  Check,
  CalendarCheck
} from 'lucide-react';
import { api } from '../../services/api.js';
import { ComplaintCategory } from '../../types/index.js';
import { Language } from '../../i18n/translations.js';

// Icon mapping helper
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Trash2: Trash2,
  AlertTriangle: AlertTriangle,
  Archive: Archive,
  Truck: Truck,
  Droplets: Droplets,
  HelpCircle: HelpCircle,
  ShieldAlert: ShieldAlert,
  Waves: Waves,
  TreePine: TreePine,
  Sparkles: Sparkles
};

// Available icons for icon picker
const AVAILABLE_ICONS = [
  'Trash2',
  'AlertTriangle',
  'Archive',
  'Truck',
  'Droplets',
  'HelpCircle',
  'ShieldAlert',
  'Waves',
  'TreePine',
  'Sparkles'
];

interface CategoryManagementProps {
  lang: Language;
}

export const CategoryManagement: React.FC<CategoryManagementProps> = ({ lang }) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);

  // Add category fields
  const [addName, setAddName] = useState<string>('');
  const [addNameGu, setAddNameGu] = useState<string>('');
  const [addNameHi, setAddNameHi] = useState<string>('');
  const [addDesc, setAddDesc] = useState<string>('');
  const [addIcon, setAddIcon] = useState<string>('Trash2');
  const [addApprovalDays, setAddApprovalDays] = useState<number>(2);
  const [addWorkDays, setAddWorkDays] = useState<number>(5);
  const [savingAdd, setSavingAdd] = useState<boolean>(false);

  // Edit category fields
  const [editName, setEditName] = useState<string>('');
  const [editNameGu, setEditNameGu] = useState<string>('');
  const [editNameHi, setEditNameHi] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');
  const [editIcon, setEditIcon] = useState<string>('Trash2');
  const [editApprovalDays, setEditApprovalDays] = useState<number>(2);
  const [editWorkDays, setEditWorkDays] = useState<number>(5);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load categories:', err);
      setError(err.message || 'Failed to fetch complaint categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredCategories = categories.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.category_name?.toLowerCase().includes(q) ||
      c.category_name_gu?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  });

  const handleOpenEdit = (cat: any) => {
    setSelectedCategory(cat);
    setEditName(cat.category_name || '');
    setEditNameGu(cat.category_name_gu || '');
    setEditNameHi(cat.category_name_hi || '');
    setEditDesc(cat.description || '');
    setEditIcon(cat.icon || 'Trash2');
    setEditApprovalDays(cat.max_approval_days || 2);
    setEditWorkDays(cat.max_work_days || 5);
    setEditIsActive(cat.is_active !== false);
    setEditModalOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addDesc.trim()) {
      setError('Please provide Category Name and Description.');
      return;
    }
    setSavingAdd(true);
    setError(null);

    try {
      const res = await api.createAdminCategory({
        category_name: addName.trim(),
        category_name_gu: addNameGu.trim() || addName.trim(),
        category_name_hi: addNameHi.trim() || addName.trim(),
        description: addDesc.trim(),
        icon: addIcon,
        max_approval_days: Number(addApprovalDays) || 2,
        max_work_days: Number(addWorkDays) || 5
      });

      if (res.success) {
        setSuccessMessage(`Category "${addName}" added successfully with SLA.`);
        setTimeout(() => setSuccessMessage(null), 4000);
        setAddModalOpen(false);
        setAddName('');
        setAddNameGu('');
        setAddNameHi('');
        setAddDesc('');
        setAddApprovalDays(2);
        setAddWorkDays(5);
        fetchCategories();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create category');
    } finally {
      setSavingAdd(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    setSavingEdit(true);
    setError(null);

    try {
      const res = await api.updateAdminCategory(selectedCategory.id, {
        category_name: editName.trim(),
        category_name_gu: editNameGu.trim(),
        category_name_hi: editNameHi.trim(),
        description: editDesc.trim(),
        icon: editIcon,
        max_approval_days: Number(editApprovalDays),
        max_work_days: Number(editWorkDays),
        is_active: editIsActive
      });

      if (res.success) {
        setSuccessMessage(`Category "${editName}" updated successfully.`);
        setTimeout(() => setSuccessMessage(null), 4000);
        setEditModalOpen(false);
        fetchCategories();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update category');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to deactivate category "${name}"?`)) return;
    try {
      const res = await api.deleteAdminCategory(id);
      if (res.success) {
        setSuccessMessage(`Category "${name}" deactivated.`);
        setTimeout(() => setSuccessMessage(null), 3000);
        fetchCategories();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
    }
  };

  const renderIcon = (iconName: string) => {
    const Component = ICON_MAP[iconName] || HelpCircle;
    return <Component className="w-5 h-5 text-[#095c54]" />;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="bg-white p-6 rounded-3xl border border-[#e2e8f0] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#095c54] text-xs font-black border border-teal-200">
              GRIEVANCE CLASSIFICATION & SLA ENFORCEMENT
            </span>
          </div>
          <h2 className="text-xl font-black text-[#0f2925] tracking-tight">
            Manage Complaint Categories & SLA Deadlines
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure issue categories (Littering, Waterlogging, etc.), max approval days (breaches flag the ward officer), and max work days.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* View toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
            <button
              onClick={() => setViewLayout('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewLayout === 'grid' ? 'bg-white shadow-2xs text-[#095c54]' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid Card View (Matches Submission Interface)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewLayout('table')}
              className={`p-1.5 rounded-lg transition ${
                viewLayout === 'table' ? 'bg-white shadow-2xs text-[#095c54]' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>

          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search category..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
            />
          </div>

          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 bg-[#095c54] hover:bg-[#074741] text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2A. Card Grid View (Matches User Screenshot Style) */}
      {viewLayout === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map(cat => (
            <div
              key={cat.id}
              className={`p-4 bg-white rounded-3xl border transition shadow-xs flex flex-col justify-between relative group ${
                cat.is_active !== false ? 'border-[#e2e8f0] hover:border-[#095c54]' : 'border-slate-200 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  {/* Circular Icon with border like screenshot */}
                  <div className="w-12 h-12 rounded-full border-2 border-orange-400 bg-orange-50 flex items-center justify-center shrink-0">
                    {renderIcon(cat.icon)}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#095c54] hover:bg-teal-50 transition"
                      title="Edit Category & SLA"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.category_name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Deactivate Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Category Names */}
                <h3 className="font-black text-[#0f2925] text-sm leading-snug">
                  {cat.category_name}
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  {cat.category_name_gu}
                </p>
                <p className="text-[11px] text-slate-600 font-medium mt-2 line-clamp-2">
                  {cat.description}
                </p>
              </div>

              {/* SLA Badges Section as requested */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2 py-1 rounded-xl border border-amber-200 text-[11px] font-bold">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>Max Approval: <strong className="font-black">{cat.max_approval_days || 2} Days</strong></span>
                  </div>

                  <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2 py-1 rounded-xl border border-emerald-200 text-[11px] font-bold">
                    <CalendarCheck className="w-3 h-3 text-emerald-600" />
                    <span>Max Work: <strong className="font-black">{cat.max_work_days || 5} Days</strong></span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-between">
                  <span>{cat.active_complaints_count || 0} Open Complaints</span>
                  {cat.is_active === false && <span className="text-red-500 font-bold">Inactive</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2B. Table View */}
      {viewLayout === 'table' && (
        <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-[#e2e8f0] text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Icon & Category</th>
                  <th className="py-3.5 px-4">Gujarati / Regional</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4 text-center">Max Approval (SLA)</th>
                  <th className="py-3.5 px-4 text-center">Max Resolution (SLA)</th>
                  <th className="py-3.5 px-4 text-center">Active Issues</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCategories.map(cat => (
                  <tr key={cat.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full border border-orange-300 bg-orange-50 flex items-center justify-center shrink-0">
                          {renderIcon(cat.icon)}
                        </div>
                        <span className="font-black text-[#0f2925]">{cat.category_name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-bold">
                      {cat.category_name_gu}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={cat.description}>
                      {cat.description}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-black text-[11px]">
                        {cat.max_approval_days || 2} Days
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-[11px]">
                        {cat.max_work_days || 5} Days
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                      {cat.active_complaints_count || 0}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#095c54] hover:bg-teal-50 transition"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id, cat.category_name)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Add Category Modal with Max Approval & Max Work Days */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-[#0f2925] mb-1">
              Add New Complaint Category
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-4">
              Create a new category for civic grievances with strict SLA approval and resolution deadlines.
            </p>

            <form onSubmit={handleSaveAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Name (English) *</label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="e.g. Street Light Damage"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Name in Gujarati *</label>
                  <input
                    type="text"
                    required
                    value={addNameGu}
                    onChange={e => setAddNameGu(e.target.value)}
                    placeholder="e.g. સ્ટ્રીટ લાઇટ નુકસાન"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Name in Hindi</label>
                  <input
                    type="text"
                    value={addNameHi}
                    onChange={e => setAddNameHi(e.target.value)}
                    placeholder="e.g. स्ट्रीट लाइट नुकसान"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description *</label>
                <textarea
                  rows={2}
                  required
                  value={addDesc}
                  onChange={e => setAddDesc(e.target.value)}
                  placeholder="Provide clarity on what issues fall under this category..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                />
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Category Icon</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ICONS.map(ic => {
                    const isSelected = addIcon === ic;
                    return (
                      <button
                        type="button"
                        key={ic}
                        onClick={() => setAddIcon(ic)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border transition ${
                          isSelected
                            ? 'bg-[#095c54] text-white border-[#095c54] shadow-2xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                        title={ic}
                      >
                        {renderIcon(ic)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SLA Configuration Inputs as requested */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-xs font-black text-[#0f2925] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#095c54]" />
                  <span>SLA Rules & Deadline Configuration</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Max Approval Days (SLA) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      required
                      value={addApprovalDays}
                      onChange={e => setAddApprovalDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black focus:outline-none focus:border-[#095c54]"
                    />
                    <p className="text-[10px] text-amber-700 font-semibold mt-1">
                      If deadline is missed, the Ward Officer is flagged to Admin.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Max Work Days (Resolution) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      required
                      value={addWorkDays}
                      onChange={e => setAddWorkDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black focus:outline-none focus:border-[#095c54]"
                    />
                    <p className="text-[10px] text-slate-500 font-medium mt-1">
                      Maximum allowed days for workforce to fully resolve this problem.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAdd}
                  className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white font-black text-xs transition shadow-xs flex items-center gap-1.5"
                >
                  {savingAdd ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Add Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Edit Category Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-[#0f2925] mb-1">
              Edit Complaint Category & SLA
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-4">
              Update details or adjust SLA deadline parameters for {selectedCategory?.category_name}.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Name (English)</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Name in Gujarati</label>
                  <input
                    type="text"
                    required
                    value={editNameGu}
                    onChange={e => setEditNameGu(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Name in Hindi</label>
                  <input
                    type="text"
                    value={editNameHi}
                    onChange={e => setEditNameHi(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#095c54]"
                />
              </div>

              {/* SLA Inputs */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-xs font-black text-[#0f2925] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#095c54]" />
                  <span>Configured SLAs</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Max Approval Days (SLA)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      required
                      value={editApprovalDays}
                      onChange={e => setEditApprovalDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black focus:outline-none focus:border-[#095c54]"
                    />
                    <p className="text-[10px] text-amber-700 font-semibold mt-1">
                      Breach triggers Ward Officer flagging.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Max Work Days (Resolution)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      required
                      value={editWorkDays}
                      onChange={e => setEditWorkDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black focus:outline-none focus:border-[#095c54]"
                    />
                  </div>
                </div>
              </div>

              {/* Active status */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="catActive"
                  checked={editIsActive}
                  onChange={e => setEditIsActive(e.target.checked)}
                  className="rounded text-[#095c54] focus:ring-[#095c54]"
                />
                <label htmlFor="catActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Category is active and visible in citizen complaint submission
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white font-black text-xs transition shadow-xs flex items-center gap-1.5"
                >
                  {savingEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
